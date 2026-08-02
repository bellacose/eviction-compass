-- ============ ENUMS ============
CREATE TYPE public.matter_hold_type AS ENUM (
  'bankruptcy','military_review','payment_plan','attorney_review',
  'missing_documentation','tenant_dispute','court_stay','compliance_review','administrative'
);
CREATE TYPE public.task_status AS ENUM ('open','in_progress','completed','cancelled');
CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');

-- ============ TRANSITION RULES (data-driven config) ============
CREATE TABLE public.matter_transition_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_key text NOT NULL UNIQUE,
  from_status public.case_status NOT NULL,
  to_status public.case_status NOT NULL,
  label text NOT NULL,
  description text,
  allowed_roles text[] NOT NULL DEFAULT ARRAY['admin']::text[],
  requires_reason boolean NOT NULL DEFAULT false,
  prerequisite_keys text[] NOT NULL DEFAULT '{}',
  blocking_hold_types public.matter_hold_type[] NOT NULL DEFAULT '{}',
  creates_task_json jsonb,
  completes_task_types text[] NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matter_transition_rules TO authenticated;
GRANT ALL ON public.matter_transition_rules TO service_role;
ALTER TABLE public.matter_transition_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules readable by authenticated" ON public.matter_transition_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage rules" ON public.matter_transition_rules
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_rules_updated_at BEFORE UPDATE ON public.matter_transition_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRANSITIONS (append-only) ============
CREATE TABLE public.matter_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  from_status public.case_status,
  to_status public.case_status NOT NULL,
  transition_key text NOT NULL,
  requested_by uuid,
  performed_by uuid,
  actor_role text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_matter_transitions_case ON public.matter_transitions(case_id, created_at DESC);
-- append-only: no UPDATE/DELETE grants to any app role
GRANT SELECT ON public.matter_transitions TO authenticated;
GRANT SELECT, INSERT ON public.matter_transitions TO service_role;
ALTER TABLE public.matter_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read transitions" ON public.matter_transitions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "clients read own transitions" ON public.matter_transitions
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_id AND public.owns_client(c.client_id)
  ));

-- ============ HOLDS ============
CREATE TABLE public.matter_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hold_type public.matter_hold_type NOT NULL,
  held_from_status public.case_status,
  reason text,
  opened_by uuid,
  owner_user_id uuid,
  review_date date,
  released_at timestamptz,
  released_by uuid,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_matter_holds_case ON public.matter_holds(case_id) WHERE released_at IS NULL;
GRANT SELECT ON public.matter_holds TO authenticated;
GRANT ALL ON public.matter_holds TO service_role;
ALTER TABLE public.matter_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage holds" ON public.matter_holds
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own holds" ON public.matter_holds
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_id AND public.owns_client(c.client_id)
  ));
CREATE TRIGGER trg_holds_updated_at BEFORE UPDATE ON public.matter_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT UPDATE, INSERT ON public.matter_holds TO authenticated;

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  assigned_user_id uuid,
  assigned_role text,
  due_at timestamptz,
  priority public.task_priority NOT NULL DEFAULT 'normal',
  blocking boolean NOT NULL DEFAULT false,
  is_internal boolean NOT NULL DEFAULT false,
  status public.task_status NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  completed_by uuid,
  related_record_type text,
  related_record_id uuid,
  escalation_level integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_case_status ON public.tasks(case_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage tasks" ON public.tasks
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own non-internal tasks" ON public.tasks
  FOR SELECT TO authenticated USING (
    is_internal = false AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = case_id AND public.owns_client(c.client_id)
    )
  );
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CASES: proposed vs confirmed filing eligibility ============
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS proposed_eligible_to_file_date date,
  ADD COLUMN IF NOT EXISTS confirmed_eligible_to_file_date date,
  ADD COLUMN IF NOT EXISTS eligibility_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS eligibility_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_notes text;

-- ============ SEED TRANSITION RULES (Bible 4.4) ============
INSERT INTO public.matter_transition_rules
 (transition_key, from_status, to_status, label, allowed_roles, requires_reason, prerequisite_keys, blocking_hold_types, completes_task_types, creates_task_json, order_index)
VALUES
 ('submit_for_review','draft','attorney_review','Submit for attorney review',ARRAY['client','admin'],false,ARRAY['intake_complete'],ARRAY[]::public.matter_hold_type[],ARRAY['complete_intake'],'{"task_type":"attorney_review","title":"Review submitted matter","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,10),
 ('request_information','attorney_review','intake','Request more information',ARRAY['admin'],true,'{}',ARRAY[]::public.matter_hold_type[],ARRAY['attorney_review'],'{"task_type":"supply_information","title":"Supply requested information","assigned_role":"client","blocking":true,"is_internal":false}'::jsonb,20),
 ('resubmit_matter','intake','attorney_review','Resubmit matter',ARRAY['client','admin'],false,'{}',ARRAY['bankruptcy','compliance_review']::public.matter_hold_type[],ARRAY['supply_information'],'{"task_type":"attorney_review","title":"Review resubmitted matter","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,30),
 ('approve_notice_route','attorney_review','notice_preparation','Approve notice route',ARRAY['admin'],false,'{}',ARRAY['bankruptcy','military_review','compliance_review','tenant_dispute']::public.matter_hold_type[],ARRAY['attorney_review'],'{"task_type":"prepare_notice","title":"Prepare statutory notice","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,40),
 ('approve_direct_filing','attorney_review','ready_to_file','Approve direct filing',ARRAY['admin'],true,'{}',ARRAY['bankruptcy','military_review','compliance_review']::public.matter_hold_type[],ARRAY['attorney_review'],NULL,50),
 ('record_notice_service','notice_preparation','notice_served','Record notice service',ARRAY['admin'],false,ARRAY['notice_served_recorded'],ARRAY['bankruptcy','compliance_review']::public.matter_hold_type[],ARRAY['prepare_notice'],NULL,60),
 ('begin_waiting_period','notice_served','waiting_period','Begin statutory waiting period',ARRAY['admin'],false,'{}',ARRAY['bankruptcy']::public.matter_hold_type[],'{}',NULL,70),
 ('confirm_eligibility_ready','waiting_period','ready_to_file','Advance to ready to file',ARRAY['admin'],false,ARRAY['eligibility_confirmed'],ARRAY['bankruptcy','military_review','payment_plan','compliance_review','court_stay']::public.matter_hold_type[],'{}','{"task_type":"file_petition","title":"File petition with court","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,80),
 ('record_filing','ready_to_file','filed','Record court filing',ARRAY['admin'],false,'{}',ARRAY['bankruptcy','military_review','payment_plan','compliance_review','court_stay']::public.matter_hold_type[],ARRAY['file_petition'],NULL,90),
 ('schedule_appearance','filed','court_scheduled','Schedule court appearance',ARRAY['admin'],false,'{}',ARRAY['bankruptcy','court_stay']::public.matter_hold_type[],'{}',NULL,100),
 ('begin_court_process','court_scheduled','in_court_process','Begin court process',ARRAY['admin'],false,'{}',ARRAY['bankruptcy','court_stay']::public.matter_hold_type[],'{}',NULL,110),
 ('await_outcome','in_court_process','outcome_pending','Await outcome',ARRAY['admin'],false,'{}',ARRAY[]::public.matter_hold_type[],'{}',NULL,120),
 ('record_outcome','outcome_pending','resolved','Record outcome',ARRAY['admin'],true,'{}',ARRAY[]::public.matter_hold_type[],'{}','{"task_type":"final_accounting","title":"Complete final accounting","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,130),
 ('close_matter','resolved','closed','Close matter',ARRAY['admin'],true,'{}',ARRAY[]::public.matter_hold_type[],ARRAY['final_accounting'],NULL,140);

-- ============ TRANSITION ENGINE ============
CREATE OR REPLACE FUNCTION public.transition_matter(
  _case_id uuid,
  _transition_key text,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.cases;
  r public.matter_transition_rules;
  uid uuid := auth.uid();
  actor_role text;
  hold public.matter_holds;
  prereq text;
  t jsonb;
  next_actions jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'Matter not found'; END IF;

  -- actor role + organization scope
  IF public.is_admin(uid) THEN
    actor_role := 'admin';
  ELSIF c.client_id = public.get_user_client_id(uid) THEN
    actor_role := 'client';
  ELSE
    RAISE EXCEPTION 'Not authorized for this matter';
  END IF;

  SELECT * INTO r FROM public.matter_transition_rules
   WHERE transition_key = _transition_key AND is_active;
  IF r IS NULL THEN RAISE EXCEPTION 'Unknown transition: %', _transition_key; END IF;

  IF c.status <> r.from_status THEN
    RAISE EXCEPTION 'Transition % is not allowed from status %', _transition_key, c.status;
  END IF;

  IF NOT (actor_role = ANY (r.allowed_roles)) THEN
    RAISE EXCEPTION 'Role % may not perform %', actor_role, _transition_key;
  END IF;

  IF r.requires_reason AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required for %', _transition_key;
  END IF;

  -- blocking holds
  SELECT * INTO hold FROM public.matter_holds
   WHERE case_id = _case_id AND released_at IS NULL
     AND (cardinality(r.blocking_hold_types) = 0 OR hold_type = ANY (r.blocking_hold_types))
   LIMIT 1;
  IF hold IS NOT NULL AND cardinality(r.blocking_hold_types) > 0 THEN
    RAISE EXCEPTION 'Blocked by an active % hold', hold.hold_type;
  END IF;

  -- prerequisites
  FOREACH prereq IN ARRAY r.prerequisite_keys LOOP
    IF prereq = 'intake_complete' THEN
      IF c.property_id IS NULL OR c.primary_tenant_id IS NULL OR c.matter_type IS NULL THEN
        RAISE EXCEPTION 'Prerequisite not met: intake is incomplete';
      END IF;
    ELSIF prereq = 'notice_served_recorded' THEN
      IF NOT EXISTS (SELECT 1 FROM public.notices n WHERE n.case_id = _case_id AND n.served_date IS NOT NULL) THEN
        RAISE EXCEPTION 'Prerequisite not met: no served notice recorded';
      END IF;
    ELSIF prereq = 'eligibility_confirmed' THEN
      IF c.confirmed_eligible_to_file_date IS NULL OR c.eligibility_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Prerequisite not met: filing eligibility has not been confirmed';
      END IF;
    ELSIF prereq = 'no_blocking_tasks' THEN
      IF EXISTS (SELECT 1 FROM public.tasks tk WHERE tk.case_id = _case_id AND tk.blocking AND tk.status IN ('open','in_progress')) THEN
        RAISE EXCEPTION 'Prerequisite not met: blocking tasks remain open';
      END IF;
    END IF;
  END LOOP;

  UPDATE public.cases
     SET status = r.to_status, updated_at = now(),
         submitted_at = CASE WHEN r.to_status = 'attorney_review' AND submitted_at IS NULL THEN now() ELSE submitted_at END,
         submitted_by = CASE WHEN r.to_status = 'attorney_review' AND submitted_by IS NULL THEN uid ELSE submitted_by END,
         closed_date = CASE WHEN r.to_status = 'closed' THEN CURRENT_DATE ELSE closed_date END
   WHERE id = _case_id
   RETURNING * INTO c;

  INSERT INTO public.matter_transitions
    (case_id, from_status, to_status, transition_key, requested_by, performed_by, actor_role, reason, metadata)
  VALUES (_case_id, r.from_status, r.to_status, r.transition_key, uid, uid, actor_role, _reason, COALESCE(_metadata,'{}'::jsonb));

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'status_transitioned',
          format('Status changed: %s → %s', r.from_status, r.to_status),
          _reason,
          jsonb_build_object('transition_key', r.transition_key, 'from', r.from_status, 'to', r.to_status, 'actor_role', actor_role),
          false, uid);

  IF _transition_key = 'request_information' THEN
    INSERT INTO public.matter_events (case_id, event_key, label, detail, is_internal, created_by)
    VALUES (_case_id, 'matter_amendment_requested', 'Additional information requested', _reason, false, uid);
  ELSIF _transition_key = 'resubmit_matter' THEN
    INSERT INTO public.matter_events (case_id, event_key, label, detail, is_internal, created_by)
    VALUES (_case_id, 'matter_resubmitted', 'Matter resubmitted for review', _reason, false, uid);
  END IF;

  -- complete related tasks
  IF cardinality(r.completes_task_types) > 0 THEN
    UPDATE public.tasks
       SET status = 'completed', completed_at = now(), completed_by = uid
     WHERE case_id = _case_id AND task_type = ANY (r.completes_task_types) AND status IN ('open','in_progress');
    IF FOUND THEN
      INSERT INTO public.matter_events (case_id, event_key, label, is_internal, created_by)
      VALUES (_case_id, 'task_completed', 'Task completed', true, uid);
    END IF;
  END IF;

  -- create follow-up task
  IF r.creates_task_json IS NOT NULL THEN
    t := r.creates_task_json;
    INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by)
    VALUES (_case_id, t->>'task_type', t->>'title', t->>'assigned_role',
            COALESCE((t->>'blocking')::boolean,false), COALESCE((t->>'is_internal')::boolean,false), uid);
    INSERT INTO public.matter_events (case_id, event_key, label, detail, is_internal, created_by)
    VALUES (_case_id, 'task_created', 'Task created', t->>'title', COALESCE((t->>'is_internal')::boolean,false), uid);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
    INTO next_actions
    FROM public.matter_transition_rules
   WHERE is_active AND from_status = c.status AND actor_role = ANY (allowed_roles);

  RETURN jsonb_build_object('matter', to_jsonb(c), 'next_actions', next_actions);
END $$;

REVOKE ALL ON FUNCTION public.transition_matter(uuid, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.transition_matter(uuid, text, text, jsonb) TO authenticated, service_role;

-- ============ HOLDS ============
CREATE OR REPLACE FUNCTION public.open_matter_hold(
  _case_id uuid, _hold_type public.matter_hold_type, _reason text,
  _owner_user_id uuid DEFAULT NULL, _review_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c public.cases; uid uuid := auth.uid(); hold_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'Matter not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.matter_holds WHERE case_id=_case_id AND hold_type=_hold_type AND released_at IS NULL) THEN
    RAISE EXCEPTION 'An active hold of this type already exists';
  END IF;

  INSERT INTO public.matter_holds (case_id, hold_type, held_from_status, reason, opened_by, owner_user_id, review_date)
  VALUES (_case_id, _hold_type, c.status, _reason, uid, _owner_user_id, _review_date)
  RETURNING id INTO hold_id;

  UPDATE public.cases SET is_on_hold = true, hold_reason = _reason, updated_at = now() WHERE id = _case_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'matter_hold_opened', format('Hold opened: %s', _hold_type), _reason,
          jsonb_build_object('hold_id', hold_id, 'hold_type', _hold_type, 'held_from_status', c.status), false, uid);
  RETURN hold_id;
END $$;
REVOKE ALL ON FUNCTION public.open_matter_hold(uuid, public.matter_hold_type, text, uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.open_matter_hold(uuid, public.matter_hold_type, text, uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_matter_hold(_hold_id uuid, _release_reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE h public.matter_holds; uid uuid := auth.uid(); remaining int;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO h FROM public.matter_holds WHERE id = _hold_id FOR UPDATE;
  IF h IS NULL THEN RAISE EXCEPTION 'Hold not found'; END IF;
  IF h.released_at IS NOT NULL THEN RAISE EXCEPTION 'Hold already released'; END IF;

  UPDATE public.matter_holds
     SET released_at = now(), released_by = uid, release_reason = _release_reason
   WHERE id = _hold_id;

  SELECT count(*) INTO remaining FROM public.matter_holds WHERE case_id = h.case_id AND released_at IS NULL;
  IF remaining = 0 THEN
    UPDATE public.cases SET is_on_hold = false, hold_reason = NULL, updated_at = now() WHERE id = h.case_id;
  END IF;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (h.case_id, 'matter_hold_released', format('Hold released: %s', h.hold_type), _release_reason,
          jsonb_build_object('hold_id', h.id, 'held_from_status', h.held_from_status), false, uid);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.release_matter_hold(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.release_matter_hold(uuid, text) TO authenticated, service_role;

-- ============ ELIGIBILITY CONFIRMATION ============
CREATE OR REPLACE FUNCTION public.confirm_filing_eligibility(
  _case_id uuid, _confirmed_date date, _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); c public.cases;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized to confirm filing eligibility'; END IF;
  IF _confirmed_date IS NULL THEN RAISE EXCEPTION 'A confirmed date is required'; END IF;

  UPDATE public.cases
     SET confirmed_eligible_to_file_date = _confirmed_date,
         eligibility_confirmed_by = uid,
         eligibility_confirmed_at = now(),
         confirmation_notes = _notes,
         updated_at = now()
   WHERE id = _case_id
   RETURNING * INTO c;
  IF c IS NULL THEN RAISE EXCEPTION 'Matter not found'; END IF;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'attorney_eligibility_confirmed', 'Filing eligibility confirmed', _notes,
          jsonb_build_object('confirmed_eligible_to_file_date', _confirmed_date,
                             'proposed_eligible_to_file_date', c.proposed_eligible_to_file_date), false, uid);
  RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.confirm_filing_eligibility(uuid, date, text) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_filing_eligibility(uuid, date, text) TO authenticated, service_role;

-- ============ TASK COMPLETION ============
CREATE OR REPLACE FUNCTION public.complete_task(_task_id uuid, _note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE tk public.tasks; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO tk FROM public.tasks WHERE id = _task_id FOR UPDATE;
  IF tk IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF tk.status = 'completed' THEN RETURN true; END IF;

  UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid WHERE id=_task_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (tk.case_id, 'task_completed', format('Task completed: %s', tk.title), _note,
          jsonb_build_object('task_id', tk.id, 'task_type', tk.task_type), tk.is_internal, uid);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.complete_task(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_task(uuid, text) TO authenticated, service_role;

-- ============ PHASE D TODO ============
COMMENT ON FUNCTION public.auto_create_collection_from_judgment() IS
'TODO (Phase D): DISABLE THIS TRIGGER FUNCTION. It creates collection matters with principal = 0 and inserts a duplicate debtor row instead of reusing the linked tenant/debtor. Collection handoff must instead use an approved final accounting balance (Matter Bible 8.6, 9.2, 10.7, 14.5). Left unchanged in Phase A deliberately.';