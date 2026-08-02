-- ============================================================ enums
CREATE TYPE public.attorney_referral_status AS ENUM
  ('draft','sent','pending_acceptance','accepted','declined','needs_information','withdrawn','completed');

CREATE TYPE public.information_request_status AS ENUM
  ('open','responded','under_review','resolved','withdrawn');

-- ============================================================ referrals
CREATE TABLE public.attorney_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  attorney_id uuid REFERENCES public.counsel(id),
  firm_id uuid REFERENCES public.firms(id),
  referral_packet_id uuid REFERENCES public.referral_packets(id),
  status public.attorney_referral_status NOT NULL DEFAULT 'draft',
  sent_by uuid,
  sent_at timestamptz,
  decided_by uuid,
  decided_at timestamptz,
  decline_reason text,
  withdrawal_reason text,
  completion_notes text,
  fee_arrangement text,
  client_visible_status text,
  idempotency_key text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One active referral per matter (draft is not active).
CREATE UNIQUE INDEX attorney_referrals_one_active_per_case
  ON public.attorney_referrals (case_id)
  WHERE status IN ('sent','pending_acceptance','accepted','needs_information');

CREATE INDEX attorney_referrals_case_idx ON public.attorney_referrals (case_id);
CREATE INDEX attorney_referrals_attorney_idx ON public.attorney_referrals (attorney_id);
CREATE INDEX attorney_referrals_firm_idx ON public.attorney_referrals (firm_id);

CREATE TABLE public.attorney_referral_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.attorney_referrals(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  from_status public.attorney_referral_status,
  to_status public.attorney_referral_status NOT NULL,
  transition_key text NOT NULL,
  actor_user_id uuid,
  actor_role text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX attorney_referral_transitions_idem
  ON public.attorney_referral_transitions (referral_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX attorney_referral_transitions_ref_idx
  ON public.attorney_referral_transitions (referral_id, created_at);

CREATE TABLE public.attorney_referral_transition_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_key text NOT NULL UNIQUE,
  from_status public.attorney_referral_status NOT NULL,
  to_status public.attorney_referral_status NOT NULL,
  label text NOT NULL,
  description text,
  allowed_roles text[] NOT NULL DEFAULT '{}',
  requires_reason boolean NOT NULL DEFAULT false,
  requires_named_attorney boolean NOT NULL DEFAULT false,
  requires_packet boolean NOT NULL DEFAULT false,
  creates_task_json jsonb,
  completes_task_types text[] NOT NULL DEFAULT '{}',
  event_key text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ information requests
CREATE TABLE public.information_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.attorney_referrals(id) ON DELETE SET NULL,
  requested_by uuid,
  requested_by_counsel_id uuid REFERENCES public.counsel(id),
  assigned_user_id uuid,
  assigned_role text,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  related_record_type text,
  related_record_id uuid,
  blocking boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  status public.information_request_status NOT NULL DEFAULT 'open',
  response_text text,
  responded_by uuid,
  responded_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX information_requests_case_idx ON public.information_requests (case_id);
CREATE INDEX information_requests_referral_idx ON public.information_requests (referral_id);

-- Append-only response history: the original request and every reply survive.
CREATE TABLE public.information_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.information_requests(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  document_ids uuid[] NOT NULL DEFAULT '{}',
  responded_by uuid,
  responder_role text,
  is_revision boolean NOT NULL DEFAULT false,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX information_request_responses_idem
  ON public.information_request_responses (request_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================ grants
GRANT SELECT ON public.attorney_referrals TO authenticated;
GRANT ALL ON public.attorney_referrals TO service_role;
GRANT SELECT ON public.attorney_referral_transitions TO authenticated;
GRANT ALL ON public.attorney_referral_transitions TO service_role;
GRANT SELECT ON public.attorney_referral_transition_rules TO authenticated;
GRANT ALL ON public.attorney_referral_transition_rules TO service_role;
GRANT SELECT ON public.information_requests TO authenticated;
GRANT ALL ON public.information_requests TO service_role;
GRANT SELECT ON public.information_request_responses TO authenticated;
GRANT ALL ON public.information_request_responses TO service_role;

-- ============================================================ helpers
CREATE OR REPLACE FUNCTION public.attorney_can_access_referral(_referral_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.attorney_referrals r
     WHERE r.id = _referral_id
       AND public.current_attorney_id() IS NOT NULL
       AND (
         r.attorney_id = public.current_attorney_id()
         OR (r.firm_id IS NOT NULL AND r.firm_id = ANY (public.attorney_firm_ids()))
       )
       AND public.attorney_can_access_case(r.case_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.client_can_access_case(_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
     WHERE c.id = _case_id
       AND c.client_id = public.get_user_client_id(auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.has_blocking_information_request(_case_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.information_requests ir
     WHERE ir.case_id = _case_id AND ir.blocking
       AND ir.status IN ('open','responded','under_review')
  )
$$;

-- ============================================================ RLS
ALTER TABLE public.attorney_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attorney_referral_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attorney_referral_transition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.information_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.information_request_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read referrals" ON public.attorney_referrals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys read their referrals" ON public.attorney_referrals
  FOR SELECT TO authenticated USING (public.attorney_can_access_referral(id));
CREATE POLICY "Clients read referrals on their matters" ON public.attorney_referrals
  FOR SELECT TO authenticated USING (public.client_can_access_case(case_id));

CREATE POLICY "Admins read referral history" ON public.attorney_referral_transitions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys read referral history" ON public.attorney_referral_transitions
  FOR SELECT TO authenticated USING (public.attorney_can_access_referral(referral_id));

CREATE POLICY "Authenticated read referral rules" ON public.attorney_referral_transition_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins read information requests" ON public.information_requests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys read information requests" ON public.information_requests
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));
CREATE POLICY "Clients read their information requests" ON public.information_requests
  FOR SELECT TO authenticated USING (
    public.client_can_access_case(case_id)
    AND (assigned_user_id = auth.uid() OR assigned_role = 'client')
  );

CREATE POLICY "Admins read responses" ON public.information_request_responses
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys read responses" ON public.information_request_responses
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));
CREATE POLICY "Clients read their responses" ON public.information_request_responses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.information_requests ir
             WHERE ir.id = request_id
               AND public.client_can_access_case(ir.case_id)
               AND (ir.assigned_user_id = auth.uid() OR ir.assigned_role = 'client'))
  );

-- ============================================================ triggers
CREATE TRIGGER attorney_referrals_updated_at BEFORE UPDATE ON public.attorney_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER information_requests_updated_at BEFORE UPDATE ON public.information_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER attorney_referral_rules_updated_at BEFORE UPDATE ON public.attorney_referral_transition_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referral history is append only.
CREATE OR REPLACE FUNCTION public.forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'This record is append-only'; END $$;

CREATE TRIGGER attorney_referral_transitions_immutable
  BEFORE UPDATE OR DELETE ON public.attorney_referral_transitions
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();
CREATE TRIGGER information_request_responses_immutable
  BEFORE UPDATE OR DELETE ON public.information_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();

-- ============================================================ referral matrix seed
INSERT INTO public.attorney_referral_transition_rules
  (transition_key, from_status, to_status, label, allowed_roles, requires_reason, requires_named_attorney, requires_packet, creates_task_json, completes_task_types, event_key, order_index)
VALUES
 ('send_referral','draft','sent','Send referral','{admin}',false,false,true,
   '{"task_type":"attorney_review_referral","title":"Review referral packet","assigned_role":"attorney","blocking":false,"is_internal":false}'::jsonb,
   '{}','attorney_referral_sent',10),
 ('acknowledge_referral','sent','pending_acceptance','Acknowledge receipt','{admin,attorney}',false,false,false,
   '{"task_type":"attorney_accept_referral","title":"Accept or decline referral","assigned_role":"attorney","blocking":true,"is_internal":false}'::jsonb,
   '{attorney_review_referral}','attorney_referral_acknowledged',20),
 ('accept_referral','pending_acceptance','accepted','Accept referral','{attorney}',false,true,false,
   NULL,'{attorney_accept_referral,attorney_review_referral}','attorney_referral_accepted',30),
 ('decline_referral','pending_acceptance','declined','Decline referral','{attorney}',true,true,false,
   '{"task_type":"admin_reassign_referral","title":"Reassign declined referral","assigned_role":"admin","blocking":true,"is_internal":true}'::jsonb,
   '{attorney_accept_referral,attorney_review_referral}','attorney_referral_declined',40),
 ('request_information','accepted','needs_information','Request information','{attorney,admin}',true,false,false,
   NULL,'{}','attorney_referral_needs_information',50),
 ('information_satisfied','needs_information','accepted','Return to legal review','{attorney,admin}',false,false,false,
   NULL,'{attorney_review_information_response}','attorney_referral_information_satisfied',60),
 ('complete_referral','accepted','completed','Complete referral','{attorney,admin}',false,false,false,
   NULL,'{attorney_review_referral,attorney_accept_referral,attorney_review_revised_packet}','attorney_referral_completed',70),
 ('withdraw_sent_referral','sent','withdrawn','Withdraw referral','{admin}',true,false,false,
   NULL,'{attorney_review_referral,attorney_accept_referral}','attorney_referral_withdrawn',80),
 ('withdraw_pending_referral','pending_acceptance','withdrawn','Withdraw referral','{admin}',true,false,false,
   NULL,'{attorney_review_referral,attorney_accept_referral}','attorney_referral_withdrawn',90),
 ('withdraw_accepted_referral','accepted','withdrawn','Withdraw accepted referral','{admin}',true,false,false,
   NULL,'{attorney_review_referral,attorney_accept_referral,attorney_review_revised_packet}','attorney_referral_withdrawn',100),
 ('withdraw_needs_information_referral','needs_information','withdrawn','Withdraw referral','{admin}',true,false,false,
   NULL,'{attorney_review_information_response}','attorney_referral_withdrawn',110);

-- ============================================================ create referral
CREATE OR REPLACE FUNCTION public.create_attorney_referral(
  _case_id uuid,
  _attorney_id uuid DEFAULT NULL,
  _firm_id uuid DEFAULT NULL,
  _referral_packet_id uuid DEFAULT NULL,
  _fee_arrangement text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); r public.attorney_referrals; f_id uuid := _firm_id;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _attorney_id IS NULL AND _firm_id IS NULL THEN
    RAISE EXCEPTION 'A referral needs an attorney or a firm';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cases WHERE id = _case_id) THEN
    RAISE EXCEPTION 'Matter not found';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO r FROM public.attorney_referrals
     WHERE case_id = _case_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN RETURN jsonb_build_object('referral', to_jsonb(r), 'replayed', true); END IF;
  END IF;

  IF f_id IS NULL AND _attorney_id IS NOT NULL THEN
    SELECT firm_id INTO f_id FROM public.counsel WHERE id = _attorney_id;
  END IF;

  INSERT INTO public.attorney_referrals
    (case_id, attorney_id, firm_id, referral_packet_id, status, fee_arrangement,
     client_visible_status, idempotency_key, created_by)
  VALUES (_case_id, _attorney_id, f_id, _referral_packet_id, 'draft', _fee_arrangement,
     'Preparing attorney referral', _idempotency_key, uid)
  RETURNING * INTO r;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'attorney_referral_created', 'Attorney referral drafted', NULL,
          jsonb_build_object('referral_id', r.id, 'attorney_id', _attorney_id, 'firm_id', f_id), true, uid);

  RETURN jsonb_build_object('referral', to_jsonb(r), 'replayed', false);
END $$;

-- ============================================================ transition referral
CREATE OR REPLACE FUNCTION public.transition_attorney_referral(
  _referral_id uuid,
  _transition_key text,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid();
  r public.attorney_referrals;
  rule public.attorney_referral_transition_rules;
  actor_role text;
  att_id uuid := public.current_attorney_id();
  next_actions jsonb;
  t jsonb;
  existing uuid;
  clabel text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO r FROM public.attorney_referrals WHERE id = _referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;

  SELECT * INTO rule FROM public.attorney_referral_transition_rules
   WHERE transition_key = _transition_key AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown referral transition: %', _transition_key; END IF;

  -- Idempotent replay
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing FROM public.attorney_referral_transitions
     WHERE referral_id = _referral_id AND idempotency_key = _idempotency_key;
    IF existing IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
        INTO next_actions FROM public.attorney_referral_transition_rules
       WHERE is_active AND from_status = r.status;
      RETURN jsonb_build_object('referral', to_jsonb(r), 'next_actions', next_actions, 'replayed', true);
    END IF;
  END IF;

  -- Actor role
  IF public.is_admin(uid) THEN
    actor_role := 'admin';
  ELSIF att_id IS NOT NULL AND public.attorney_can_access_referral(_referral_id) THEN
    actor_role := 'attorney';
  ELSE
    RAISE EXCEPTION 'Not authorized for this referral';
  END IF;

  IF NOT (actor_role = ANY (rule.allowed_roles)) THEN
    RAISE EXCEPTION 'Role % may not perform %', actor_role, _transition_key;
  END IF;

  IF r.status <> rule.from_status THEN
    RAISE EXCEPTION 'Transition % is not allowed from status %', _transition_key, r.status;
  END IF;

  IF rule.requires_reason AND (_reason IS NULL OR btrim(_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required for %', _transition_key;
  END IF;

  IF rule.requires_packet AND r.referral_packet_id IS NULL THEN
    RAISE EXCEPTION 'A referral packet version is required before sending';
  END IF;

  -- Accept/decline must be performed by a named active attorney.
  IF rule.requires_named_attorney THEN
    IF actor_role <> 'attorney' OR att_id IS NULL THEN
      RAISE EXCEPTION 'Only the named attorney may perform %', _transition_key;
    END IF;
    IF r.attorney_id IS NOT NULL AND r.attorney_id <> att_id THEN
      RAISE EXCEPTION 'This referral is directed to another attorney';
    END IF;
  END IF;

  clabel := CASE rule.to_status
    WHEN 'sent' THEN 'Referred to attorney'
    WHEN 'pending_acceptance' THEN 'Awaiting attorney acceptance'
    WHEN 'accepted' THEN 'Attorney reviewing'
    WHEN 'declined' THEN 'Being reassigned'
    WHEN 'needs_information' THEN 'Information requested'
    WHEN 'withdrawn' THEN 'Referral withdrawn'
    WHEN 'completed' THEN 'Attorney review complete'
    ELSE r.client_visible_status END;

  UPDATE public.attorney_referrals
     SET status = rule.to_status,
         -- an unnamed firm referral becomes named at acceptance/decline
         attorney_id = CASE WHEN rule.requires_named_attorney AND attorney_id IS NULL THEN att_id ELSE attorney_id END,
         sent_by = CASE WHEN rule.to_status = 'sent' AND sent_by IS NULL THEN uid ELSE sent_by END,
         sent_at = CASE WHEN rule.to_status = 'sent' AND sent_at IS NULL THEN now() ELSE sent_at END,
         decided_by = CASE WHEN rule.to_status IN ('accepted','declined') THEN uid ELSE decided_by END,
         decided_at = CASE WHEN rule.to_status IN ('accepted','declined') THEN now() ELSE decided_at END,
         decline_reason = CASE WHEN rule.to_status = 'declined' THEN _reason ELSE decline_reason END,
         withdrawal_reason = CASE WHEN rule.to_status = 'withdrawn' THEN _reason ELSE withdrawal_reason END,
         completion_notes = CASE WHEN rule.to_status = 'completed' THEN COALESCE(_reason, completion_notes) ELSE completion_notes END,
         client_visible_status = clabel,
         updated_at = now()
   WHERE id = _referral_id
   RETURNING * INTO r;

  INSERT INTO public.attorney_referral_transitions
    (referral_id, case_id, from_status, to_status, transition_key, actor_user_id, actor_role, reason, metadata, idempotency_key)
  VALUES (_referral_id, r.case_id, rule.from_status, rule.to_status, rule.transition_key, uid, actor_role,
          _reason, COALESCE(_metadata,'{}'::jsonb), _idempotency_key);

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (r.case_id, rule.event_key, rule.label, _reason,
          jsonb_build_object('referral_id', r.id, 'from', rule.from_status, 'to', rule.to_status,
                             'actor_role', actor_role, 'packet_id', r.referral_packet_id), false, uid);

  IF cardinality(rule.completes_task_types) > 0 THEN
    UPDATE public.tasks
       SET status = 'completed', completed_at = now(), completed_by = uid
     WHERE case_id = r.case_id AND task_type = ANY (rule.completes_task_types)
       AND status IN ('open','in_progress');
  END IF;

  IF rule.creates_task_json IS NOT NULL THEN
    t := rule.creates_task_json;
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks tk
       WHERE tk.case_id = r.case_id AND tk.task_type = t->>'task_type' AND tk.status IN ('open','in_progress')
    ) THEN
      INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by, related_record_type, related_record_id)
      VALUES (r.case_id, t->>'task_type', t->>'title', t->>'assigned_role',
              COALESCE((t->>'blocking')::boolean,false), COALESCE((t->>'is_internal')::boolean,false), uid,
              'attorney_referral', r.id);
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('transition_key', transition_key, 'label', label, 'to_status', to_status)), '[]'::jsonb)
    INTO next_actions FROM public.attorney_referral_transition_rules
   WHERE is_active AND from_status = r.status;

  RETURN jsonb_build_object('referral', to_jsonb(r), 'next_actions', next_actions, 'replayed', false);
END $$;

-- ============================================================ revised packet
CREATE OR REPLACE FUNCTION public.attach_revised_packet(
  _referral_id uuid, _packet_id uuid, _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); r public.attorney_referrals;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.attorney_referrals WHERE id = _referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF r.status NOT IN ('accepted','needs_information','sent','pending_acceptance') THEN
    RAISE EXCEPTION 'Only an active referral can receive a revised packet';
  END IF;
  IF r.referral_packet_id = _packet_id THEN
    RETURN jsonb_build_object('referral', to_jsonb(r), 'replayed', true);
  END IF;

  -- The packet under review is never silently swapped: the prior version stays
  -- on the audit trail and the attorney gets an explicit acknowledgment task.
  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (r.case_id, 'referral_packet_superseded', 'Revised referral packet issued', _notes,
          jsonb_build_object('referral_id', r.id, 'previous_packet_id', r.referral_packet_id,
                             'new_packet_id', _packet_id), false, uid);

  UPDATE public.attorney_referrals
     SET referral_packet_id = _packet_id, updated_at = now()
   WHERE id = _referral_id RETURNING * INTO r;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks WHERE case_id = r.case_id
      AND task_type = 'attorney_review_revised_packet' AND status IN ('open','in_progress')
  ) THEN
    INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by, related_record_type, related_record_id)
    VALUES (r.case_id, 'attorney_review_revised_packet', 'Acknowledge revised referral packet',
            'attorney', true, false, uid, 'attorney_referral', r.id);
  END IF;

  RETURN jsonb_build_object('referral', to_jsonb(r), 'replayed', false);
END $$;

-- ============================================================ information requests
CREATE OR REPLACE FUNCTION public.create_information_request(
  _case_id uuid,
  _category text,
  _description text,
  _blocking boolean DEFAULT true,
  _referral_id uuid DEFAULT NULL,
  _assigned_user_id uuid DEFAULT NULL,
  _assigned_role text DEFAULT 'client',
  _due_at timestamptz DEFAULT NULL,
  _related_record_type text DEFAULT NULL,
  _related_record_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ir public.information_requests; att uuid := public.current_attorney_id();
        tk_id uuid; actor_role text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_admin(uid) THEN actor_role := 'admin';
  ELSIF att IS NOT NULL AND public.attorney_can_access_case(_case_id) THEN actor_role := 'attorney';
  ELSE RAISE EXCEPTION 'Not authorized for this matter'; END IF;

  IF _description IS NULL OR btrim(_description) = '' THEN
    RAISE EXCEPTION 'A description is required';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO ir FROM public.information_requests
     WHERE case_id = _case_id AND related_record_type IS NOT DISTINCT FROM _related_record_type
       AND description = _description AND requested_by = uid
       AND created_at > now() - interval '1 day';
    IF FOUND THEN RETURN jsonb_build_object('request', to_jsonb(ir), 'replayed', true); END IF;
  END IF;

  INSERT INTO public.information_requests
    (case_id, referral_id, requested_by, requested_by_counsel_id, assigned_user_id, assigned_role,
     category, description, related_record_type, related_record_id, blocking, due_at, status)
  VALUES (_case_id, _referral_id, uid, att, _assigned_user_id, _assigned_role,
     COALESCE(_category,'other'), _description, _related_record_type, _related_record_id,
     COALESCE(_blocking,true), _due_at, 'open')
  RETURNING * INTO ir;

  INSERT INTO public.tasks (case_id, task_type, title, description, assigned_user_id, assigned_role,
                            blocking, is_internal, due_at, created_by, related_record_type, related_record_id)
  VALUES (_case_id, 'client_provide_information',
          format('Provide %s information', replace(COALESCE(_category,'other'),'_',' ')),
          _description, _assigned_user_id, COALESCE(_assigned_role,'client'),
          COALESCE(_blocking,true), false, _due_at, uid, 'information_request', ir.id)
  RETURNING id INTO tk_id;

  UPDATE public.information_requests SET task_id = tk_id WHERE id = ir.id RETURNING * INTO ir;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'information_request_created',
          format('Information requested: %s', replace(COALESCE(_category,'other'),'_',' ')),
          _description, jsonb_build_object('request_id', ir.id, 'referral_id', _referral_id,
                                           'blocking', COALESCE(_blocking,true)), false, uid);

  RETURN jsonb_build_object('request', to_jsonb(ir), 'replayed', false);
END $$;

CREATE OR REPLACE FUNCTION public.respond_to_information_request(
  _request_id uuid, _response_text text, _document_ids uuid[] DEFAULT '{}',
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ir public.information_requests; actor_role text; is_rev boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _response_text IS NULL OR btrim(_response_text) = '' THEN
    RAISE EXCEPTION 'A response is required';
  END IF;

  SELECT * INTO ir FROM public.information_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  IF public.is_admin(uid) THEN actor_role := 'admin';
  ELSIF ir.assigned_user_id = uid THEN actor_role := 'assignee';
  ELSIF ir.assigned_role = 'client' AND public.client_can_access_case(ir.case_id) THEN actor_role := 'client';
  ELSE RAISE EXCEPTION 'This request is not assigned to you'; END IF;

  IF ir.status NOT IN ('open','responded','under_review') THEN
    RAISE EXCEPTION 'This request is no longer open';
  END IF;

  IF _idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.information_request_responses
     WHERE request_id = _request_id AND idempotency_key = _idempotency_key
  ) THEN
    RETURN jsonb_build_object('request', to_jsonb(ir), 'replayed', true);
  END IF;

  is_rev := EXISTS (SELECT 1 FROM public.information_request_responses WHERE request_id = _request_id);

  INSERT INTO public.information_request_responses
    (request_id, case_id, response_text, document_ids, responded_by, responder_role, is_revision, idempotency_key)
  VALUES (_request_id, ir.case_id, _response_text, COALESCE(_document_ids,'{}'), uid, actor_role, is_rev, _idempotency_key);

  UPDATE public.information_requests
     SET status = 'responded', response_text = _response_text,
         responded_by = uid, responded_at = now(), updated_at = now()
   WHERE id = _request_id RETURNING * INTO ir;

  IF ir.task_id IS NOT NULL THEN
    UPDATE public.tasks SET status = 'completed', completed_at = now(), completed_by = uid
     WHERE id = ir.task_id AND status IN ('open','in_progress');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks WHERE case_id = ir.case_id
      AND task_type = 'attorney_review_information_response'
      AND related_record_id = ir.id AND status IN ('open','in_progress')
  ) THEN
    INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by, related_record_type, related_record_id)
    VALUES (ir.case_id, 'attorney_review_information_response', 'Review information response',
            'attorney', ir.blocking, false, uid, 'information_request', ir.id);
  END IF;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (ir.case_id, 'information_request_responded', 'Information request answered', _response_text,
          jsonb_build_object('request_id', ir.id, 'is_revision', is_rev), false, uid);

  RETURN jsonb_build_object('request', to_jsonb(ir), 'replayed', false);
END $$;

CREATE OR REPLACE FUNCTION public.review_information_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ir public.information_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO ir FROM public.information_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_admin(uid) OR public.attorney_can_access_case(ir.case_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF ir.status <> 'responded' THEN RAISE EXCEPTION 'Only a responded request can be taken under review'; END IF;

  UPDATE public.information_requests SET status = 'under_review', updated_at = now()
   WHERE id = _request_id RETURNING * INTO ir;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (ir.case_id, 'information_request_under_review', 'Information response under review', _note,
          jsonb_build_object('request_id', ir.id), true, uid);
  RETURN to_jsonb(ir);
END $$;

CREATE OR REPLACE FUNCTION public.resolve_information_request(
  _request_id uuid, _resolution_notes text, _reopen boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ir public.information_requests; r public.attorney_referrals; remaining int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT _reopen AND (_resolution_notes IS NULL OR btrim(_resolution_notes) = '') THEN
    RAISE EXCEPTION 'Resolution notes are required';
  END IF;

  SELECT * INTO ir FROM public.information_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_admin(uid) OR public.attorney_can_access_case(ir.case_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF ir.status NOT IN ('responded','under_review') THEN
    RAISE EXCEPTION 'Only a responded request can be resolved or reopened';
  END IF;

  IF _reopen THEN
    UPDATE public.information_requests SET status = 'open', updated_at = now()
     WHERE id = _request_id RETURNING * INTO ir;

    UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid
     WHERE case_id = ir.case_id AND related_record_id = ir.id
       AND task_type = 'attorney_review_information_response' AND status IN ('open','in_progress');

    INSERT INTO public.tasks (case_id, task_type, title, description, assigned_user_id, assigned_role,
                              blocking, is_internal, created_by, related_record_type, related_record_id)
    VALUES (ir.case_id, 'client_provide_information', 'Provide additional information',
            _resolution_notes, ir.assigned_user_id, ir.assigned_role, ir.blocking, false, uid,
            'information_request', ir.id);

    INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
    VALUES (ir.case_id, 'information_request_created', 'Information request reopened', _resolution_notes,
            jsonb_build_object('request_id', ir.id, 'reopened', true), false, uid);
    RETURN to_jsonb(ir);
  END IF;

  UPDATE public.information_requests
     SET status = 'resolved', resolution_notes = _resolution_notes,
         resolved_by = uid, resolved_at = now(), updated_at = now()
   WHERE id = _request_id RETURNING * INTO ir;

  UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid
   WHERE case_id = ir.case_id AND related_record_id = ir.id AND status IN ('open','in_progress');

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (ir.case_id, 'information_request_resolved', 'Information request resolved', _resolution_notes,
          jsonb_build_object('request_id', ir.id), false, uid);

  -- When no blocking request remains, an information-blocked referral returns to review.
  SELECT count(*) INTO remaining FROM public.information_requests
   WHERE case_id = ir.case_id AND blocking AND status IN ('open','responded','under_review');

  IF remaining = 0 AND ir.referral_id IS NOT NULL THEN
    SELECT * INTO r FROM public.attorney_referrals WHERE id = ir.referral_id FOR UPDATE;
    IF FOUND AND r.status = 'needs_information' THEN
      UPDATE public.attorney_referrals
         SET status = 'accepted', client_visible_status = 'Attorney reviewing', updated_at = now()
       WHERE id = r.id RETURNING * INTO r;
      INSERT INTO public.attorney_referral_transitions
        (referral_id, case_id, from_status, to_status, transition_key, actor_user_id, actor_role, reason)
      VALUES (r.id, r.case_id, 'needs_information', 'accepted', 'information_satisfied', uid,
              CASE WHEN public.is_admin(uid) THEN 'admin' ELSE 'attorney' END,
              'All blocking information requests resolved');
      INSERT INTO public.matter_events (case_id, event_key, label, metadata, is_internal, created_by)
      VALUES (r.case_id, 'attorney_referral_information_satisfied', 'Referral returned to legal review',
              jsonb_build_object('referral_id', r.id), false, uid);
    END IF;
  END IF;

  RETURN to_jsonb(ir);
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_information_request(_request_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ir public.information_requests;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO ir FROM public.information_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_admin(uid) OR ir.requested_by = uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF ir.status IN ('resolved','withdrawn') THEN RAISE EXCEPTION 'This request is already closed'; END IF;

  UPDATE public.information_requests
     SET status = 'withdrawn', resolution_notes = _reason, resolved_by = uid,
         resolved_at = now(), updated_at = now()
   WHERE id = _request_id RETURNING * INTO ir;

  UPDATE public.tasks SET status='cancelled', completed_at=now(), completed_by=uid
   WHERE case_id = ir.case_id AND related_record_id = ir.id AND status IN ('open','in_progress');

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (ir.case_id, 'information_request_withdrawn', 'Information request withdrawn', _reason,
          jsonb_build_object('request_id', ir.id), false, uid);
  RETURN to_jsonb(ir);
END $$;

-- ============================================================ filing guard
-- A blocking information request must prevent attorney filing approval.
CREATE OR REPLACE FUNCTION public.confirm_filing_eligibility(_case_id uuid, _confirmed_date date, _notes text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); c public.cases;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized to confirm filing eligibility'; END IF;
  IF _confirmed_date IS NULL THEN RAISE EXCEPTION 'A confirmed date is required'; END IF;
  IF public.has_blocking_information_request(_case_id) THEN
    RAISE EXCEPTION 'Filing approval is blocked by an open information request';
  END IF;

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
END $function$;