-- Helpers -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_attorney_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.counsel c
   WHERE c.user_id = auth.uid()
     AND c.status = 'active'
     AND c.is_active = true
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_attorney()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_attorney_id() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.attorney_firm_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT f), '{}')
    FROM (
      SELECT c.firm_id AS f FROM public.counsel c
       WHERE c.id = public.current_attorney_id() AND c.firm_id IS NOT NULL
      UNION
      SELECT fm.firm_id FROM public.firm_members fm
       JOIN public.firms fr ON fr.id = fm.firm_id AND fr.is_active
       WHERE fm.counsel_id = public.current_attorney_id()
    ) s
$$;

CREATE OR REPLACE FUNCTION public.is_firm_admin(_firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _firm_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.counsel c
             WHERE c.id = public.current_attorney_id()
               AND c.firm_id = _firm_id AND c.is_firm_admin)
    OR EXISTS (SELECT 1 FROM public.firm_members fm
                WHERE fm.counsel_id = public.current_attorney_id()
                  AND fm.firm_id = _firm_id AND fm.member_role = 'firm_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.attorney_can_access_case(_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _case_id IS NOT NULL
     AND public.current_attorney_id() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.case_counsel cc
        WHERE cc.case_id = _case_id
          AND cc.unassigned_at IS NULL
          AND (
            cc.counsel_id = public.current_attorney_id()
            OR (cc.allow_firm_access
                AND cc.firm_id IS NOT NULL
                AND cc.firm_id = ANY (public.attorney_firm_ids()))
          )
     )
$$;

-- Case-scoped read policies -------------------------------------------
CREATE POLICY "Attorneys view assigned cases" ON public.cases
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(id));

CREATE POLICY "Attorneys view assigned case_counsel" ON public.case_counsel
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned notices" ON public.notices
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned ledger" ON public.ledger_entries
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned service records" ON public.service_records
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned court events" ON public.court_events
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned milestones" ON public.case_milestones
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned timeline" ON public.matter_events
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned holds" ON public.matter_holds
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned transitions" ON public.matter_transitions
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view assigned case tenants" ON public.case_tenants
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys view tenants on assigned cases" ON public.tenants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c
             WHERE c.primary_tenant_id = tenants.id AND public.attorney_can_access_case(c.id))
    OR EXISTS (SELECT 1 FROM public.case_tenants ct
                WHERE ct.tenant_id = tenants.id AND public.attorney_can_access_case(ct.case_id))
  );

CREATE POLICY "Attorneys view tenancies on assigned cases" ON public.tenancies
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c
             WHERE c.tenancy_id = tenancies.id AND public.attorney_can_access_case(c.id))
  );

CREATE POLICY "Attorneys view properties on assigned cases" ON public.properties
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c
             WHERE c.property_id = properties.id AND public.attorney_can_access_case(c.id))
  );

CREATE POLICY "Attorneys view units on assigned cases" ON public.units
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases c
             WHERE c.unit_id = units.id AND public.attorney_can_access_case(c.id))
  );

-- Documents: assigned matters, excluding admin-internal files
CREATE POLICY "Attorneys view assigned documents" ON public.documents
  FOR SELECT TO authenticated USING (
    case_id IS NOT NULL
    AND COALESCE(is_internal, false) = false
    AND public.attorney_can_access_case(case_id)
  );

-- Notes: read + author on assigned matters
CREATE POLICY "Attorneys read notes on assigned cases" ON public.case_notes
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE POLICY "Attorneys add notes on assigned cases" ON public.case_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.attorney_can_access_case(case_id) AND created_by = auth.uid());

-- Tasks: their own / their firm's tasks on assigned matters
CREATE POLICY "Attorneys read their tasks" ON public.tasks
  FOR SELECT TO authenticated USING (
    public.attorney_can_access_case(case_id)
    AND (assigned_user_id = auth.uid() OR assigned_role = 'attorney' OR assigned_user_id IS NULL)
  );

CREATE POLICY "Attorneys update their tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.attorney_can_access_case(case_id)
    AND (assigned_user_id = auth.uid() OR assigned_role = 'attorney')
  )
  WITH CHECK (public.attorney_can_access_case(case_id));

-- Directory visibility: own firm + colleagues only
CREATE POLICY "Attorneys view their firms" ON public.firms
  FOR SELECT TO authenticated USING (id = ANY (public.attorney_firm_ids()));

CREATE POLICY "Attorneys view firm colleagues" ON public.counsel
  FOR SELECT TO authenticated USING (
    id = public.current_attorney_id()
    OR (firm_id IS NOT NULL AND firm_id = ANY (public.attorney_firm_ids()))
  );

CREATE POLICY "Attorneys view their firm memberships" ON public.firm_members
  FOR SELECT TO authenticated USING (
    counsel_id = public.current_attorney_id()
    OR firm_id = ANY (public.attorney_firm_ids())
  );

-- Own profile access already exists for all users via profiles policies.

-- Storage: attorneys may read case documents for assigned matters only
CREATE POLICY "Attorneys read assigned case documents" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
       WHERE d.file_path = storage.objects.name
         AND d.case_id IS NOT NULL
         AND COALESCE(d.is_internal, false) = false
         AND public.attorney_can_access_case(d.case_id)
    )
  );

-- Workflow engine: recognise attorney actors, permit only explicit rules
CREATE OR REPLACE FUNCTION public.transition_matter(_case_id uuid, _transition_key text, _reason text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb, _idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.cases;
  r public.matter_transition_rules;
  uid uuid := auth.uid();
  actor_role text;
  blocking_hold_type text;
  prereq text;
  t jsonb;
  next_actions jsonb;
  existing_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

  IF public.is_admin(uid) THEN
    actor_role := 'admin';
  ELSIF public.attorney_can_access_case(_case_id) THEN
    actor_role := 'attorney';
  ELSIF c.client_id = public.get_user_client_id(uid) THEN
    actor_role := 'client';
  ELSE
    RAISE EXCEPTION 'Not authorized for this matter';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing_id FROM public.matter_transitions
     WHERE case_id = _case_id AND idempotency_key = _idempotency_key;
    IF existing_id IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
        INTO next_actions
        FROM public.matter_transition_rules
       WHERE is_active AND from_status = c.status AND actor_role = ANY (allowed_roles);
      RETURN jsonb_build_object('matter', to_jsonb(c), 'next_actions', next_actions, 'replayed', true);
    END IF;
  END IF;

  SELECT * INTO r FROM public.matter_transition_rules
   WHERE transition_key = _transition_key AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown transition: %', _transition_key; END IF;

  IF c.status <> r.from_status THEN
    RAISE EXCEPTION 'Transition % is not allowed from status %', _transition_key, c.status;
  END IF;

  IF NOT (actor_role = ANY (r.allowed_roles)) THEN
    RAISE EXCEPTION 'Role % may not perform %', actor_role, _transition_key;
  END IF;

  IF r.requires_reason AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required for %', _transition_key;
  END IF;

  IF cardinality(r.blocking_hold_types) > 0 THEN
    SELECT h.hold_type::text INTO blocking_hold_type
      FROM public.matter_holds h
     WHERE h.case_id = _case_id AND h.released_at IS NULL
       AND h.hold_type = ANY (r.blocking_hold_types)
     LIMIT 1;
    IF blocking_hold_type IS NOT NULL THEN
      RAISE EXCEPTION 'Blocked by an active % hold', blocking_hold_type;
    END IF;
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
END $function$;