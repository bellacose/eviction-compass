-- 1) Idempotency support
ALTER TABLE public.matter_transitions ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS matter_transitions_idem_uniq
  ON public.matter_transitions (case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Guard: cases.status may only change from inside transition_matter()
CREATE OR REPLACE FUNCTION public.guard_case_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND COALESCE(current_setting('app.allow_status_change', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'Matter status can only be changed through transition_matter()';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_case_status ON public.cases;
CREATE TRIGGER trg_guard_case_status
BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.guard_case_status_change();

-- 3) Clients may no longer write themselves into attorney_review directly
DROP POLICY IF EXISTS "Clients edit own draft matters" ON public.cases;
CREATE POLICY "Clients edit own draft matters"
ON public.cases FOR UPDATE TO authenticated
USING (owns_client(client_id) AND status::text = 'draft')
WITH CHECK (owns_client(client_id) AND status::text = 'draft');

-- 4) transition_matter(): idempotency key + session flag
CREATE OR REPLACE FUNCTION public.transition_matter(
  _case_id uuid,
  _transition_key text,
  _reason text DEFAULT NULL::text,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
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
  existing public.matter_transitions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'Matter not found'; END IF;

  IF public.is_admin(uid) THEN
    actor_role := 'admin';
  ELSIF c.client_id = public.get_user_client_id(uid) THEN
    actor_role := 'client';
  ELSE
    RAISE EXCEPTION 'Not authorized for this matter';
  END IF;

  -- idempotent replay
  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO existing FROM public.matter_transitions
     WHERE case_id = _case_id AND idempotency_key = _idempotency_key;
    IF existing IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
        INTO next_actions
        FROM public.matter_transition_rules
       WHERE is_active AND from_status = c.status AND actor_role = ANY (allowed_roles);
      RETURN jsonb_build_object('matter', to_jsonb(c), 'next_actions', next_actions, 'replayed', true);
    END IF;
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

  SELECT * INTO hold FROM public.matter_holds
   WHERE case_id = _case_id AND released_at IS NULL
     AND (cardinality(r.blocking_hold_types) = 0 OR hold_type = ANY (r.blocking_hold_types))
   LIMIT 1;
  IF hold IS NOT NULL AND cardinality(r.blocking_hold_types) > 0 THEN
    RAISE EXCEPTION 'Blocked by an active % hold', hold.hold_type;
  END IF;

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

  PERFORM set_config('app.allow_status_change', 'on', true);

  UPDATE public.cases
     SET status = r.to_status, updated_at = now(),
         submitted_at = CASE WHEN r.to_status = 'attorney_review' AND submitted_at IS NULL THEN now() ELSE submitted_at END,
         submitted_by = CASE WHEN r.to_status = 'attorney_review' AND submitted_by IS NULL THEN uid ELSE submitted_by END,
         closed_date = CASE WHEN r.to_status = 'closed' THEN CURRENT_DATE ELSE closed_date END
   WHERE id = _case_id
   RETURNING * INTO c;

  PERFORM set_config('app.allow_status_change', 'off', true);

  INSERT INTO public.matter_transitions
    (case_id, from_status, to_status, transition_key, requested_by, performed_by, actor_role, reason, metadata, idempotency_key)
  VALUES (_case_id, r.from_status, r.to_status, r.transition_key, uid, uid, actor_role, _reason, COALESCE(_metadata,'{}'::jsonb), _idempotency_key);

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

  IF cardinality(r.completes_task_types) > 0 THEN
    UPDATE public.tasks
       SET status = 'completed', completed_at = now(), completed_by = uid
     WHERE case_id = _case_id AND task_type = ANY (r.completes_task_types) AND status IN ('open','in_progress');
    IF FOUND THEN
      INSERT INTO public.matter_events (case_id, event_key, label, is_internal, created_by)
      VALUES (_case_id, 'task_completed', 'Task completed', true, uid);
    END IF;
  END IF;

  IF r.creates_task_json IS NOT NULL THEN
    t := r.creates_task_json;
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks tk
       WHERE tk.case_id = _case_id AND tk.task_type = t->>'task_type' AND tk.status IN ('open','in_progress')
    ) THEN
      INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by)
      VALUES (_case_id, t->>'task_type', t->>'title', t->>'assigned_role',
              COALESCE((t->>'blocking')::boolean,false), COALESCE((t->>'is_internal')::boolean,false), uid);
      INSERT INTO public.matter_events (case_id, event_key, label, detail, is_internal, created_by)
      VALUES (_case_id, 'task_created', 'Task created', t->>'title', COALESCE((t->>'is_internal')::boolean,false), uid);
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
    INTO next_actions
    FROM public.matter_transition_rules
   WHERE is_active AND from_status = c.status AND actor_role = ANY (allowed_roles);

  RETURN jsonb_build_object('matter', to_jsonb(c), 'next_actions', next_actions);
END $$;

DROP FUNCTION IF EXISTS public.transition_matter(uuid, text, text, jsonb);