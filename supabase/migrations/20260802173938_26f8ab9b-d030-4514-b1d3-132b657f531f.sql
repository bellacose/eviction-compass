
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.eligibility_confirmation_status AS ENUM ('draft','confirmed','invalidated','superseded','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.filing_approval_status AS ENUM ('draft','approved','invalidated','withdrawn','superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.balance_snapshot_type AS ENUM (
    'submission','five_day_notice','fourteen_day_demand','filing_eligibility',
    'filing_approval','filing','judgment','final_accounting','collection_handoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.note_visibility AS ENUM (
    'admin_internal','client_visible','attorney_privileged','agency_visible','system_generated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ BALANCE SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS public.balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  snapshot_type public.balance_snapshot_type NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_charges numeric NOT NULL DEFAULT 0,
  total_payments numeric NOT NULL DEFAULT 0,
  total_credits numeric NOT NULL DEFAULT 0,
  total_balance numeric NOT NULL DEFAULT 0,
  source_entry_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ledger_version text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.balance_snapshots TO authenticated;
GRANT ALL ON public.balance_snapshots TO service_role;
ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read balance snapshots" ON public.balance_snapshots;
CREATE POLICY "Admins read balance snapshots" ON public.balance_snapshots
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Attorneys read assigned balance snapshots" ON public.balance_snapshots;
CREATE POLICY "Attorneys read assigned balance snapshots" ON public.balance_snapshots
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));
DROP POLICY IF EXISTS "Clients read their balance snapshots" ON public.balance_snapshots;
CREATE POLICY "Clients read their balance snapshots" ON public.balance_snapshots
  FOR SELECT TO authenticated USING (public.client_can_access_case(case_id));

DROP TRIGGER IF EXISTS trg_balance_snapshots_immutable ON public.balance_snapshots;
CREATE TRIGGER trg_balance_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.balance_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation();

CREATE OR REPLACE FUNCTION public.create_balance_snapshot(
  _case_id uuid,
  _snapshot_type public.balance_snapshot_type,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.balance_snapshots
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); s public.balance_snapshots;
        ch numeric; pay numeric; cr numeric; ids jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_admin(uid) OR public.attorney_can_access_case(_case_id)
          OR public.client_can_access_case(_case_id)) THEN
    RAISE EXCEPTION 'Not authorized for this matter';
  END IF;

  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(payment_amount),0), COALESCE(SUM(credit_amount),0),
         COALESCE(jsonb_agg(id ORDER BY entry_date, id), '[]'::jsonb)
    INTO ch, pay, cr, ids
    FROM public.ledger_entries WHERE case_id = _case_id;

  INSERT INTO public.balance_snapshots
    (case_id, snapshot_type, snapshot_date, total_charges, total_payments, total_credits,
     total_balance, source_entry_ids, created_by, metadata)
  VALUES (_case_id, _snapshot_type, CURRENT_DATE, ch, pay, cr, ch - pay - cr, ids, uid,
          COALESCE(_metadata,'{}'::jsonb))
  RETURNING * INTO s;
  RETURN s;
END $$;

-- ============ FILING ELIGIBILITY CONFIRMATIONS ============
CREATE TABLE IF NOT EXISTS public.filing_eligibility_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.attorney_referrals(id) ON DELETE SET NULL,
  referral_packet_id uuid REFERENCES public.referral_packets(id) ON DELETE SET NULL,
  attorney_id uuid REFERENCES public.counsel(id) ON DELETE SET NULL,
  proposed_eligible_to_file_date date,
  confirmed_eligible_to_file_date date NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmation_notes text NOT NULL,
  balance_snapshot_id uuid REFERENCES public.balance_snapshots(id),
  lease_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  questionnaire_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notice_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_hold_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking_request_count integer NOT NULL DEFAULT 0,
  status public.eligibility_confirmation_status NOT NULL DEFAULT 'confirmed',
  version_number integer NOT NULL DEFAULT 1,
  supersedes_confirmation_id uuid REFERENCES public.filing_eligibility_confirmations(id),
  superseded_by_confirmation_id uuid REFERENCES public.filing_eligibility_confirmations(id),
  invalidated_at timestamptz,
  invalidation_reason text,
  invalidated_by_change_event_id uuid REFERENCES public.matter_change_events(id),
  created_by uuid,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fec_idem ON public.filing_eligibility_confirmations(case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fec_active ON public.filing_eligibility_confirmations(case_id)
  WHERE status = 'confirmed';

GRANT SELECT ON public.filing_eligibility_confirmations TO authenticated;
GRANT ALL ON public.filing_eligibility_confirmations TO service_role;
ALTER TABLE public.filing_eligibility_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read confirmations" ON public.filing_eligibility_confirmations;
CREATE POLICY "Admins read confirmations" ON public.filing_eligibility_confirmations
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Attorneys read assigned confirmations" ON public.filing_eligibility_confirmations;
CREATE POLICY "Attorneys read assigned confirmations" ON public.filing_eligibility_confirmations
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));
DROP POLICY IF EXISTS "Clients read their confirmations" ON public.filing_eligibility_confirmations;
CREATE POLICY "Clients read their confirmations" ON public.filing_eligibility_confirmations
  FOR SELECT TO authenticated USING (public.client_can_access_case(case_id));

-- ============ FILING APPROVALS ============
CREATE TABLE IF NOT EXISTS public.filing_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.attorney_referrals(id) ON DELETE SET NULL,
  referral_packet_id uuid REFERENCES public.referral_packets(id) ON DELETE SET NULL,
  eligibility_confirmation_id uuid REFERENCES public.filing_eligibility_confirmations(id),
  attorney_id uuid REFERENCES public.counsel(id) ON DELETE SET NULL,
  approval_status public.filing_approval_status NOT NULL DEFAULT 'approved',
  approved_at timestamptz,
  approval_notes text,
  balance_snapshot_id uuid REFERENCES public.balance_snapshots(id),
  lease_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  questionnaire_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notice_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  packet_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  version_number integer NOT NULL DEFAULT 1,
  supersedes_approval_id uuid REFERENCES public.filing_approvals(id),
  superseded_by_approval_id uuid REFERENCES public.filing_approvals(id),
  invalidated_at timestamptz,
  invalidation_reason text,
  invalidated_by_change_event_id uuid REFERENCES public.matter_change_events(id),
  withdrawn_at timestamptz,
  withdrawn_by uuid,
  withdrawal_reason text,
  created_by uuid,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fa_idem ON public.filing_approvals(case_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fa_active ON public.filing_approvals(case_id)
  WHERE approval_status = 'approved';

GRANT SELECT ON public.filing_approvals TO authenticated;
GRANT ALL ON public.filing_approvals TO service_role;
ALTER TABLE public.filing_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read filing approvals" ON public.filing_approvals;
CREATE POLICY "Admins read filing approvals" ON public.filing_approvals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Attorneys read assigned filing approvals" ON public.filing_approvals;
CREATE POLICY "Attorneys read assigned filing approvals" ON public.filing_approvals
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));
DROP POLICY IF EXISTS "Clients read their filing approvals" ON public.filing_approvals;
CREATE POLICY "Clients read their filing approvals" ON public.filing_approvals
  FOR SELECT TO authenticated USING (public.client_can_access_case(case_id));

CREATE TRIGGER trg_fec_updated_at BEFORE UPDATE ON public.filing_eligibility_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fa_updated_at BEFORE UPDATE ON public.filing_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRIVILEGED NOTES ============
ALTER TABLE public.case_notes
  ADD COLUMN IF NOT EXISTS visibility public.note_visibility NOT NULL DEFAULT 'admin_internal',
  ADD COLUMN IF NOT EXISTS author_counsel_id uuid REFERENCES public.counsel(id) ON DELETE SET NULL;

UPDATE public.case_notes SET visibility =
  CASE WHEN note_type = 'client_update' THEN 'client_visible'::public.note_visibility
       ELSE 'admin_internal'::public.note_visibility END;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='case_notes' LOOP
    EXECUTE format('DROP POLICY %I ON public.case_notes', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage case notes" ON public.case_notes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients read client-visible notes" ON public.case_notes
  FOR SELECT TO authenticated
  USING (visibility IN ('client_visible','system_generated') AND public.client_can_access_case(case_id));

CREATE POLICY "Attorneys read permitted notes" ON public.case_notes
  FOR SELECT TO authenticated
  USING (
    public.attorney_can_access_case(case_id)
    AND (
      visibility IN ('admin_internal','client_visible','system_generated')
      OR (visibility = 'attorney_privileged'
          AND (created_by = auth.uid()
               OR author_counsel_id = public.current_attorney_id()
               OR public.current_attorney_id() IS NOT NULL))
    )
  );

CREATE POLICY "Attorneys write notes on assigned matters" ON public.case_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.attorney_can_access_case(case_id)
    AND created_by = auth.uid()
    AND visibility <> 'agency_visible'
  );

-- ============ WORKFLOW RULES ============
INSERT INTO public.matter_transition_rules
  (transition_key, from_status, to_status, label, allowed_roles, requires_reason,
   prerequisite_keys, blocking_hold_types, order_index, is_active)
VALUES
  ('attorney_approve_filing','waiting_period','ready_to_file','Approve filing readiness',
   ARRAY['attorney','admin'], false, ARRAY['eligibility_confirmed'], ARRAY[]::matter_hold_type[], 60, true),
  ('attorney_approve_filing_review','attorney_review','ready_to_file','Approve filing readiness',
   ARRAY['attorney','admin'], false, ARRAY['eligibility_confirmed'], ARRAY[]::matter_hold_type[], 61, true),
  ('withdraw_filing_approval','ready_to_file','attorney_review','Withdraw filing approval',
   ARRAY['attorney','admin'], true, ARRAY[]::text[], ARRAY[]::matter_hold_type[], 62, true),
  ('invalidate_filing_approval','ready_to_file','attorney_review','Approval invalidated by material change',
   ARRAY['attorney','admin','client'], true, ARRAY[]::text[], ARRAY[]::matter_hold_type[], 63, true)
ON CONFLICT (transition_key) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, is_active = true;

UPDATE public.matter_transition_rules
   SET allowed_roles = ARRAY['admin','attorney']
 WHERE transition_key IN ('confirm_eligibility_ready','approve_direct_filing');

-- ============ CHANGE RULES ============
INSERT INTO public.matter_change_rules (change_key, change_class, label, is_active)
VALUES
  ('ledger_charge_amount_changed','hard','Ledger charge amount changed',true),
  ('ledger_payment_amount_changed','hard','Ledger payment amount changed',true),
  ('ledger_credit_amount_changed','hard','Ledger credit amount changed',true),
  ('ledger_balance_changed','hard','Total ledger balance changed',true),
  ('notice_amount_changed','hard','Notice amount changed',true),
  ('notice_prepared_date_changed','hard','Notice preparation date changed',true),
  ('notice_mailed_date_changed','hard','Notice mailing date changed',true),
  ('notice_served_date_changed','hard','Notice service date changed',true),
  ('service_method_changed','hard','Service method changed',true),
  ('tenant_identity_changed','hard','Tenant identity changed',true),
  ('matter_type_changed','hard','Matter type changed',true),
  ('occupancy_status_changed','hard','Occupancy status changed',true),
  ('bankruptcy_status_changed','hard','Bankruptcy status changed',true),
  ('military_status_changed','hard','Military status changed',true),
  ('lease_version_changed','hard','Relevant lease version changed',true),
  ('referral_packet_superseded','hard','Approved referral packet superseded',true),
  ('supporting_document_added','soft','Nonfinancial supporting document added',true),
  ('client_visible_note_added','soft','Client-visible note added',true),
  ('internal_note_added','soft','Internal admin note added',true),
  ('contact_phone_corrected','soft','Contact phone corrected',true),
  ('property_contact_updated','soft','Property contact updated',true),
  ('typographical_correction','soft','Typographical correction',true)
ON CONFLICT (change_key) DO UPDATE
  SET change_class = EXCLUDED.change_class, label = EXCLUDED.label, is_active = true;

-- ============ CONFIRM FILING ELIGIBILITY V2 ============
CREATE OR REPLACE FUNCTION public.confirm_filing_eligibility_v2(
  _case_id uuid,
  _confirmed_date date,
  _notes text,
  _referral_id uuid DEFAULT NULL,
  _referral_packet_id uuid DEFAULT NULL,
  _questionnaire_snapshot jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid(); c public.cases; r public.attorney_referrals;
  pk public.referral_packets; att uuid := public.current_attorney_id();
  actor_role text; snap public.balance_snapshots; prior public.filing_eligibility_confirmations;
  conf public.filing_eligibility_confirmations; lease_id uuid; blocking int;
  notices_json jsonb; service_json jsonb; holds_json jsonb; next_actions jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _notes IS NULL OR btrim(_notes) = '' THEN RAISE EXCEPTION 'Confirmation notes are required'; END IF;
  IF _confirmed_date IS NULL THEN RAISE EXCEPTION 'A confirmed date is required'; END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO conf FROM public.filing_eligibility_confirmations
     WHERE case_id = _case_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('confirmation', to_jsonb(conf), 'replayed', true,
                                'next_actions', '["approve_filing_readiness"]'::jsonb);
    END IF;
  END IF;

  IF public.is_admin(uid) THEN actor_role := 'admin';
  ELSIF att IS NOT NULL AND public.attorney_can_access_case(_case_id) THEN actor_role := 'attorney';
  ELSE RAISE EXCEPTION 'Only an active assigned attorney or an administrator may confirm eligibility'; END IF;

  SELECT * INTO r FROM public.attorney_referrals
   WHERE case_id = _case_id
     AND (_referral_id IS NULL OR id = _referral_id)
     AND status IN ('accepted','needs_information','sent','pending_acceptance')
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    IF r.status <> 'accepted' THEN
      RAISE EXCEPTION 'The referral must be accepted and active before eligibility can be confirmed';
    END IF;
  ELSIF actor_role = 'attorney' THEN
    RAISE EXCEPTION 'No active referral for this matter';
  END IF;

  SELECT * INTO pk FROM public.referral_packets
   WHERE case_id = _case_id
     AND (_referral_packet_id IS NULL OR id = _referral_packet_id)
     AND status IN ('issued','approved')
   ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'A current referral packet version is required'; END IF;
  IF r.id IS NOT NULL AND r.referral_packet_id IS NOT NULL AND r.referral_packet_id <> pk.id THEN
    RAISE EXCEPTION 'The packet under review does not match the referral packet';
  END IF;

  SELECT count(*) INTO blocking FROM public.information_requests
   WHERE case_id = _case_id AND blocking AND status IN ('open','responded','under_review');
  IF blocking > 0 THEN RAISE EXCEPTION 'Filing eligibility is blocked by an open information request'; END IF;

  IF EXISTS (SELECT 1 FROM public.matter_holds WHERE case_id = _case_id AND released_at IS NULL) THEN
    RAISE EXCEPTION 'Filing eligibility is blocked by an active matter hold';
  END IF;

  -- completeness facts
  IF NOT EXISTS (SELECT 1 FROM public.notices WHERE case_id = _case_id AND served_date IS NOT NULL) THEN
    RAISE EXCEPTION 'A served notice is required before confirming eligibility';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_records WHERE case_id = _case_id) THEN
    RAISE EXCEPTION 'A service record is required before confirming eligibility';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE case_id = _case_id) THEN
    RAISE EXCEPTION 'Ledger entries are required before confirming eligibility';
  END IF;
  IF c.primary_tenant_id IS NULL OR c.property_id IS NULL THEN
    RAISE EXCEPTION 'Tenancy facts are incomplete';
  END IF;

  SELECT id INTO lease_id FROM public.documents
   WHERE case_id = _case_id AND category = 'lease' ORDER BY created_at DESC LIMIT 1;

  snap := public.create_balance_snapshot(_case_id, 'filing_eligibility',
            jsonb_build_object('referral_id', r.id, 'packet_id', pk.id));

  SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.created_at), '[]'::jsonb) INTO notices_json
    FROM public.notices n WHERE n.case_id = _case_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at), '[]'::jsonb) INTO service_json
    FROM public.service_records s WHERE s.case_id = _case_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(h)), '[]'::jsonb) INTO holds_json
    FROM public.matter_holds h WHERE h.case_id = _case_id AND h.released_at IS NULL;

  SELECT * INTO prior FROM public.filing_eligibility_confirmations
   WHERE case_id = _case_id AND status = 'confirmed' FOR UPDATE;

  IF FOUND THEN
    UPDATE public.filing_eligibility_confirmations
       SET status = 'superseded', updated_at = now() WHERE id = prior.id;
  END IF;

  INSERT INTO public.filing_eligibility_confirmations
    (case_id, referral_id, referral_packet_id, attorney_id, proposed_eligible_to_file_date,
     confirmed_eligible_to_file_date, confirmation_notes, balance_snapshot_id, lease_document_id,
     questionnaire_snapshot, notice_manifest, service_manifest, active_hold_snapshot,
     blocking_request_count, status, version_number, supersedes_confirmation_id, created_by, idempotency_key)
  VALUES (_case_id, r.id, pk.id, COALESCE(att, pk.counsel_id), c.proposed_eligible_to_file_date,
     _confirmed_date, _notes, snap.id, lease_id,
     COALESCE(_questionnaire_snapshot,'{}'::jsonb), notices_json, service_json, holds_json,
     0, 'confirmed', COALESCE(prior.version_number,0) + 1, prior.id, uid, _idempotency_key)
  RETURNING * INTO conf;

  IF prior.id IS NOT NULL THEN
    UPDATE public.filing_eligibility_confirmations
       SET superseded_by_confirmation_id = conf.id WHERE id = prior.id;
  END IF;

  -- operative authorization on the matter (proposed date is never overwritten)
  UPDATE public.cases
     SET confirmed_eligible_to_file_date = _confirmed_date,
         eligibility_confirmed_by = uid, eligibility_confirmed_at = now(),
         confirmation_notes = _notes, updated_at = now()
   WHERE id = _case_id;

  UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid
   WHERE case_id = _case_id AND task_type IN ('attorney_confirm_eligibility','attorney_rereview_matter')
     AND status IN ('open','in_progress');

  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE case_id = _case_id
                   AND task_type = 'attorney_approve_filing' AND status IN ('open','in_progress')) THEN
    INSERT INTO public.tasks (case_id, task_type, title, assigned_role, blocking, is_internal, created_by,
                              related_record_type, related_record_id)
    VALUES (_case_id, 'attorney_approve_filing', 'Approve filing readiness', 'attorney', false, false, uid,
            'filing_eligibility_confirmation', conf.id);
  END IF;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'attorney_eligibility_confirmed', 'Filing eligibility confirmed', _notes,
          jsonb_build_object('confirmation_id', conf.id, 'version', conf.version_number,
                             'packet_id', pk.id, 'referral_id', r.id,
                             'proposed_eligible_to_file_date', c.proposed_eligible_to_file_date,
                             'confirmed_eligible_to_file_date', _confirmed_date,
                             'balance_snapshot_id', snap.id), false, uid);

  next_actions := '["approve_filing_readiness"]'::jsonb;
  RETURN jsonb_build_object('confirmation', to_jsonb(conf), 'snapshot', to_jsonb(snap),
                            'next_actions', next_actions, 'replayed', false);
END $$;

-- ============ APPROVE FILING READINESS ============
CREATE OR REPLACE FUNCTION public.approve_filing_readiness(
  _case_id uuid,
  _notes text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  uid uuid := auth.uid(); c public.cases; r public.attorney_referrals;
  conf public.filing_eligibility_confirmations; prior public.filing_approvals;
  a public.filing_approvals; snap public.balance_snapshots; att uuid := public.current_attorney_id();
  pk public.referral_packets; blocking int; tkey text; matter jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO a FROM public.filing_approvals
     WHERE case_id = _case_id AND idempotency_key = _idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('approval', to_jsonb(a), 'matter', to_jsonb(c), 'replayed', true);
    END IF;
  END IF;

  IF NOT (public.is_admin(uid) OR (att IS NOT NULL AND public.attorney_can_access_case(_case_id))) THEN
    RAISE EXCEPTION 'Only an active assigned attorney or an administrator may approve filing';
  END IF;

  SELECT * INTO conf FROM public.filing_eligibility_confirmations
   WHERE case_id = _case_id AND status = 'confirmed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active confirmed eligibility record is required'; END IF;

  SELECT * INTO r FROM public.attorney_referrals WHERE id = conf.referral_id FOR UPDATE;
  IF r.id IS NOT NULL AND r.status <> 'accepted' THEN
    RAISE EXCEPTION 'The referral must be accepted before filing approval';
  END IF;

  SELECT count(*) INTO blocking FROM public.information_requests
   WHERE case_id = _case_id AND blocking AND status IN ('open','responded','under_review');
  IF blocking > 0 THEN RAISE EXCEPTION 'Filing approval is blocked by an open information request'; END IF;
  IF EXISTS (SELECT 1 FROM public.matter_holds WHERE case_id = _case_id AND released_at IS NULL) THEN
    RAISE EXCEPTION 'Filing approval is blocked by an active matter hold';
  END IF;

  SELECT * INTO pk FROM public.referral_packets WHERE id = conf.referral_packet_id;
  IF pk.id IS NULL OR pk.status NOT IN ('issued','approved') THEN
    RAISE EXCEPTION 'The reviewed referral packet is no longer current';
  END IF;

  snap := public.create_balance_snapshot(_case_id, 'filing_approval',
            jsonb_build_object('confirmation_id', conf.id, 'packet_id', pk.id));

  SELECT * INTO prior FROM public.filing_approvals
   WHERE case_id = _case_id AND approval_status = 'approved' FOR UPDATE;
  IF FOUND THEN
    UPDATE public.filing_approvals SET approval_status = 'superseded', updated_at = now() WHERE id = prior.id;
  END IF;

  INSERT INTO public.filing_approvals
    (case_id, referral_id, referral_packet_id, eligibility_confirmation_id, attorney_id,
     approval_status, approved_at, approval_notes, balance_snapshot_id, lease_document_id,
     questionnaire_snapshot, notice_manifest, service_manifest, packet_manifest,
     version_number, supersedes_approval_id, created_by, idempotency_key)
  VALUES (_case_id, conf.referral_id, conf.referral_packet_id, conf.id, COALESCE(att, conf.attorney_id),
     'approved', now(), _notes, snap.id, conf.lease_document_id,
     conf.questionnaire_snapshot, conf.notice_manifest, conf.service_manifest,
     jsonb_build_object('packet_id', pk.id, 'version', pk.version, 'status', pk.status,
                        'balance_amount', pk.balance_amount),
     COALESCE(prior.version_number,0) + 1, prior.id, uid, _idempotency_key)
  RETURNING * INTO a;

  IF prior.id IS NOT NULL THEN
    UPDATE public.filing_approvals SET superseded_by_approval_id = a.id WHERE id = prior.id;
  END IF;

  UPDATE public.tasks SET status='completed', completed_at=now(), completed_by=uid
   WHERE case_id = _case_id AND task_type = 'attorney_approve_filing' AND status IN ('open','in_progress');

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'filing_approval_granted', 'Filing readiness approved', _notes,
          jsonb_build_object('approval_id', a.id, 'confirmation_id', conf.id, 'packet_id', pk.id,
                             'balance_snapshot_id', snap.id), false, uid);

  tkey := CASE c.status
            WHEN 'waiting_period' THEN 'attorney_approve_filing'
            WHEN 'attorney_review' THEN 'attorney_approve_filing_review'
            ELSE NULL END;
  IF tkey IS NOT NULL THEN
    matter := public.transition_matter(_case_id, tkey, _notes,
                jsonb_build_object('approval_id', a.id), 'approval-' || a.id::text);
  ELSE
    matter := jsonb_build_object('matter', to_jsonb(c));
  END IF;

  RETURN jsonb_build_object('approval', to_jsonb(a), 'matter', matter, 'replayed', false);
END $$;

-- ============ WITHDRAW FILING APPROVAL ============
CREATE OR REPLACE FUNCTION public.withdraw_filing_approval(
  _approval_id uuid, _reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); a public.filing_approvals; att uuid := public.current_attorney_id();
        c public.cases; matter jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'A withdrawal reason is required'; END IF;

  SELECT * INTO a FROM public.filing_approvals WHERE id = _approval_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval not found'; END IF;
  IF a.approval_status = 'withdrawn' THEN
    RETURN jsonb_build_object('approval', to_jsonb(a), 'replayed', true);
  END IF;
  IF a.approval_status <> 'approved' THEN RAISE EXCEPTION 'Only an active approval can be withdrawn'; END IF;

  IF NOT (public.is_admin(uid) OR (att IS NOT NULL AND att = a.attorney_id)) THEN
    RAISE EXCEPTION 'Only the approving attorney or an administrator may withdraw this approval';
  END IF;

  SELECT * INTO c FROM public.cases WHERE id = a.case_id FOR UPDATE;

  UPDATE public.filing_approvals
     SET approval_status = 'withdrawn', withdrawn_at = now(), withdrawn_by = uid,
         withdrawal_reason = _reason, updated_at = now()
   WHERE id = _approval_id RETURNING * INTO a;

  UPDATE public.cases
     SET confirmed_eligible_to_file_date = NULL, eligibility_confirmed_at = NULL,
         eligibility_confirmed_by = NULL, updated_at = now()
   WHERE id = a.case_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (a.case_id, 'filing_approval_withdrawn', 'Filing approval withdrawn', _reason,
          jsonb_build_object('approval_id', a.id), false, uid);

  IF c.status = 'ready_to_file' THEN
    matter := public.transition_matter(a.case_id, 'withdraw_filing_approval', _reason,
                jsonb_build_object('approval_id', a.id), 'withdraw-' || a.id::text);
  END IF;

  RETURN jsonb_build_object('approval', to_jsonb(a), 'matter', matter, 'replayed', false);
END $$;

-- ============ CHANGE EVENT PROCESSING ============
CREATE OR REPLACE FUNCTION public.process_matter_change_event(
  _case_id uuid, _change_event_id uuid, _change_class public.matter_change_class,
  _change_key text, _detail text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); c public.cases;
        conf public.filing_eligibility_confirmations; a public.filing_approvals;
        reason text := COALESCE(_detail, format('Material change: %s', _change_key));
        invalidated boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.matter_events
              WHERE case_id = _case_id
                AND event_key IN ('filing_eligibility_invalidated','matter_soft_change_flagged')
                AND metadata->>'change_event_id' = _change_event_id::text) THEN
    RETURN jsonb_build_object('processed', false, 'replayed', true);
  END IF;

  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('processed', false); END IF;

  IF _change_class = 'soft' THEN
    INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
    VALUES (_case_id, 'matter_soft_change_flagged', format('Change flagged for review: %s', _change_key),
            _detail, jsonb_build_object('change_event_id', _change_event_id, 'change_key', _change_key),
            true, uid);

    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE case_id = _case_id
                     AND task_type = 'attorney_review_soft_change' AND status IN ('open','in_progress')) THEN
      INSERT INTO public.tasks (case_id, task_type, title, description, assigned_role, blocking, is_internal, created_by)
      VALUES (_case_id, 'attorney_review_soft_change', 'Review flagged matter change', _detail,
              'attorney', false, false, uid);
    END IF;
    RETURN jsonb_build_object('processed', true, 'change_class', 'soft');
  END IF;

  SELECT * INTO conf FROM public.filing_eligibility_confirmations
   WHERE case_id = _case_id AND status = 'confirmed' FOR UPDATE;
  IF FOUND THEN
    UPDATE public.filing_eligibility_confirmations
       SET status = 'invalidated', invalidated_at = now(), invalidation_reason = reason,
           invalidated_by_change_event_id = _change_event_id, updated_at = now()
     WHERE id = conf.id;
    invalidated := true;
  END IF;

  SELECT * INTO a FROM public.filing_approvals
   WHERE case_id = _case_id AND approval_status = 'approved' FOR UPDATE;
  IF FOUND THEN
    UPDATE public.filing_approvals
       SET approval_status = 'invalidated', invalidated_at = now(), invalidation_reason = reason,
           invalidated_by_change_event_id = _change_event_id, updated_at = now()
     WHERE id = a.id;
    invalidated := true;
  END IF;

  UPDATE public.cases
     SET confirmed_eligible_to_file_date = NULL, eligibility_confirmed_at = NULL,
         eligibility_confirmed_by = NULL, updated_at = now()
   WHERE id = _case_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'filing_eligibility_invalidated', 'Filing eligibility invalidated', reason,
          jsonb_build_object('change_event_id', _change_event_id, 'change_key', _change_key,
                             'confirmation_id', conf.id), false, uid);

  IF a.id IS NOT NULL THEN
    INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
    VALUES (_case_id, 'filing_approval_invalidated', 'Filing approval invalidated', reason,
            jsonb_build_object('change_event_id', _change_event_id, 'approval_id', a.id), false, uid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE case_id = _case_id
                   AND task_type = 'attorney_rereview_matter' AND status IN ('open','in_progress')) THEN
    INSERT INTO public.tasks (case_id, task_type, title, description, assigned_role, blocking, is_internal, created_by)
    VALUES (_case_id, 'attorney_rereview_matter', 'Re-review matter after material change', reason,
            'attorney', true, false, uid);
  END IF;

  IF c.status = 'ready_to_file' THEN
    BEGIN
      PERFORM public.transition_matter(_case_id, 'invalidate_filing_approval', reason,
                jsonb_build_object('change_event_id', _change_event_id),
                'invalidate-' || _change_event_id::text);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('processed', true, 'change_class', 'hard', 'invalidated', invalidated);
END $$;

-- hook into the existing change recorder
CREATE OR REPLACE FUNCTION public.record_matter_change(_case_id uuid, _change_key text, _detail text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); r public.matter_change_rules; klass public.matter_change_class;
        p public.referral_packets; ev_id uuid; invalidated boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cases WHERE id = _case_id) THEN
    RAISE EXCEPTION 'Matter not found';
  END IF;

  SELECT * INTO r FROM public.matter_change_rules WHERE change_key = _change_key AND is_active;
  klass := COALESCE(r.change_class, 'soft');

  SELECT * INTO p FROM public.referral_packets
   WHERE case_id = _case_id AND status IN ('issued','approved')
   ORDER BY version DESC LIMIT 1 FOR UPDATE;

  IF klass = 'hard' THEN
    invalidated := true;
    IF p.id IS NOT NULL THEN
      UPDATE public.referral_packets
         SET status = 'invalidated', invalidated_at = now(),
             invalidation_reason = COALESCE(_detail, COALESCE(r.label, _change_key))
       WHERE id = p.id;
    END IF;

    INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
    VALUES (_case_id, 'approval_invalidated',
            format('Attorney approval invalidated: %s', COALESCE(r.label, _change_key)), _detail,
            jsonb_build_object('change_key', _change_key, 'packet_id', p.id), false, uid);
  ELSE
    IF p.id IS NOT NULL THEN
      UPDATE public.referral_packets
         SET review_flagged_at = now(),
             review_reason = COALESCE(_detail, COALESCE(r.label, _change_key))
       WHERE id = p.id;
    END IF;

    INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
    VALUES (_case_id, 'review_flagged',
            format('Change flagged for review: %s', COALESCE(r.label, _change_key)), _detail,
            jsonb_build_object('change_key', _change_key, 'packet_id', p.id), true, uid);
  END IF;

  INSERT INTO public.matter_change_events
    (case_id, packet_id, change_key, change_class, detail, metadata, invalidated_approval, created_by)
  VALUES (_case_id, p.id, _change_key, klass, _detail, COALESCE(_metadata,'{}'::jsonb), invalidated, uid)
  RETURNING id INTO ev_id;

  PERFORM public.process_matter_change_event(_case_id, ev_id, klass, _change_key, _detail);

  RETURN jsonb_build_object('event_id', ev_id, 'change_class', klass,
                            'packet_id', p.id, 'invalidated_approval', invalidated);
END $function$;

-- legacy entry point now delegates
CREATE OR REPLACE FUNCTION public.confirm_filing_eligibility(_case_id uuid, _confirmed_date date, _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE res jsonb;
BEGIN
  res := public.confirm_filing_eligibility_v2(_case_id, _confirmed_date, _notes);
  RETURN res;
END $function$;
