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
END $$;

-- same record-null bug in the hold helpers
CREATE OR REPLACE FUNCTION public.open_matter_hold(_case_id uuid, _hold_type matter_hold_type, _reason text, _owner_user_id uuid DEFAULT NULL::uuid, _review_date date DEFAULT NULL::date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE c public.cases; uid uuid := auth.uid(); hold_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;
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

CREATE OR REPLACE FUNCTION public.release_matter_hold(_hold_id uuid, _release_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE h public.matter_holds; uid uuid := auth.uid(); remaining int;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO h FROM public.matter_holds WHERE id = _hold_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hold not found'; END IF;
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

CREATE OR REPLACE FUNCTION public.complete_task(_task_id uuid, _note text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE tk public.tasks; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO tk FROM public.tasks WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF tk.status = 'completed' THEN RETURN true; END IF;

  UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid WHERE id=_task_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (tk.case_id, 'task_completed', format('Task completed: %s', tk.title), _note,
          jsonb_build_object('task_id', tk.id, 'task_type', tk.task_type), tk.is_internal, uid);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_filing_eligibility(_case_id uuid, _confirmed_date date, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'attorney_eligibility_confirmed', 'Filing eligibility confirmed', _notes,
          jsonb_build_object('confirmed_eligible_to_file_date', _confirmed_date,
                             'proposed_eligible_to_file_date', c.proposed_eligible_to_file_date), false, uid);
  RETURN to_jsonb(c);
END $$;