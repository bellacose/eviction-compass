-- ========== 1. Portal activation as an explicit, separate step ==========
ALTER TABLE public.counsel
  ADD COLUMN IF NOT EXISTS user_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_terms_version text;

DROP FUNCTION IF EXISTS public.activate_attorney_account();

-- Sign-in only links the auth user to the invited counsel record. It never activates.
CREATE OR REPLACE FUNCTION public.link_attorney_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); uemail text; c public.counsel;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.counsel WHERE user_id = uid FOR UPDATE;

  IF NOT FOUND THEN
    SELECT lower(email) INTO uemail FROM auth.users WHERE id = uid;
    IF uemail IS NULL THEN RETURN jsonb_build_object('attorney', null); END IF;

    SELECT * INTO c FROM public.counsel
     WHERE user_id IS NULL AND lower(email) = uemail AND is_active
     ORDER BY created_at LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('attorney', null); END IF;

    UPDATE public.counsel
       SET user_id = uid, user_linked_at = now(), updated_at = now()
     WHERE id = c.id
     RETURNING * INTO c;
  ELSIF c.user_linked_at IS NULL THEN
    UPDATE public.counsel SET user_linked_at = now(), updated_at = now()
     WHERE id = c.id RETURNING * INTO c;
  END IF;

  RETURN jsonb_build_object('attorney', jsonb_build_object(
    'id', c.id, 'attorney_name', c.attorney_name, 'status', c.status,
    'firm_id', c.firm_id, 'is_firm_admin', c.is_firm_admin,
    'activation_required', (c.status = 'invited' AND c.is_active),
    'activation_acknowledged_at', c.activation_acknowledged_at));
END $$;

-- Explicit activation: the attorney must acknowledge the portal terms.
CREATE OR REPLACE FUNCTION public.activate_attorney_account(
  _terms_version text,
  _accept boolean,
  _bar_number text DEFAULT NULL,
  _bar_jurisdictions text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); c public.counsel;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _accept IS NOT TRUE THEN RAISE EXCEPTION 'Portal terms must be accepted to activate'; END IF;
  IF _terms_version IS NULL OR btrim(_terms_version) = '' THEN
    RAISE EXCEPTION 'A terms version is required';
  END IF;

  SELECT * INTO c FROM public.counsel WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No attorney record is linked to this account'; END IF;
  IF NOT c.is_active THEN RAISE EXCEPTION 'This attorney record has been deactivated'; END IF;
  IF c.status IN ('inactive','suspended') THEN
    RAISE EXCEPTION 'This attorney account cannot be activated (%)', c.status;
  END IF;

  UPDATE public.counsel
     SET status = 'active',
         activated_at = COALESCE(activated_at, now()),
         activation_acknowledged_at = COALESCE(activation_acknowledged_at, now()),
         activation_terms_version = _terms_version,
         bar_number = COALESCE(NULLIF(btrim(COALESCE(_bar_number,'')),''), bar_number),
         bar_jurisdictions = COALESCE(_bar_jurisdictions, bar_jurisdictions),
         updated_at = now()
   WHERE id = c.id
   RETURNING * INTO c;

  RETURN jsonb_build_object('attorney', jsonb_build_object(
    'id', c.id, 'attorney_name', c.attorney_name, 'status', c.status,
    'firm_id', c.firm_id, 'is_firm_admin', c.is_firm_admin,
    'activation_required', false,
    'activation_acknowledged_at', c.activation_acknowledged_at));
END $$;

-- ========== 2. Explicit assignment scope replaces allow_firm_access ==========
DO $$ BEGIN
  CREATE TYPE public.assignment_scope AS ENUM ('attorney_only','firm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.case_counsel
  ADD COLUMN IF NOT EXISTS scope public.assignment_scope NOT NULL DEFAULT 'attorney_only';

UPDATE public.case_counsel
   SET scope = CASE WHEN allow_firm_access THEN 'firm' ELSE 'attorney_only' END::public.assignment_scope;

CREATE OR REPLACE FUNCTION public.attorney_can_access_case(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _case_id IS NOT NULL
     AND public.current_attorney_id() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.case_counsel cc
        WHERE cc.case_id = _case_id
          AND cc.unassigned_at IS NULL
          AND (
            cc.counsel_id = public.current_attorney_id()
            OR (cc.scope = 'firm'
                AND cc.firm_id IS NOT NULL
                AND cc.firm_id = ANY (public.attorney_firm_ids()))
          )
     )
$$;

ALTER TABLE public.case_counsel DROP COLUMN IF EXISTS allow_firm_access;

-- ========== 3. Versioned referral packets ==========
DO $$ BEGIN
  CREATE TYPE public.referral_packet_status AS ENUM ('draft','issued','approved','superseded','invalidated','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.referral_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status public.referral_packet_status NOT NULL DEFAULT 'draft',
  counsel_id uuid REFERENCES public.counsel(id) ON DELETE SET NULL,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  balance_as_of date,
  balance_amount numeric NOT NULL DEFAULT 0,
  notes text,
  issued_at timestamptz,
  issued_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  approval_notes text,
  superseded_at timestamptz,
  superseded_by_packet_id uuid REFERENCES public.referral_packets(id) ON DELETE SET NULL,
  invalidated_at timestamptz,
  invalidation_reason text,
  review_flagged_at timestamptz,
  review_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, version)
);
CREATE INDEX IF NOT EXISTS idx_referral_packets_case ON public.referral_packets(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_packets TO authenticated;
GRANT ALL ON public.referral_packets TO service_role;
ALTER TABLE public.referral_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access referral_packets" ON public.referral_packets
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys view assigned referral_packets" ON public.referral_packets
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE TRIGGER trg_referral_packets_updated_at
  BEFORE UPDATE ON public.referral_packets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.referral_packet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id uuid NOT NULL REFERENCES public.referral_packets(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (packet_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_packet_documents TO authenticated;
GRANT ALL ON public.referral_packet_documents TO service_role;
ALTER TABLE public.referral_packet_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access referral_packet_documents" ON public.referral_packet_documents
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys view assigned referral_packet_documents" ON public.referral_packet_documents
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.referral_packets p
     WHERE p.id = packet_id AND public.attorney_can_access_case(p.case_id)));

CREATE OR REPLACE FUNCTION public.issue_referral_packet(
  _case_id uuid,
  _counsel_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); c public.cases; p public.referral_packets;
        next_version integer; bal numeric; f_id uuid; prior public.referral_packets;
BEGIN
  IF uid IS NULL OR NOT public.is_admin(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

  SELECT COALESCE(MAX(version),0) + 1 INTO next_version FROM public.referral_packets WHERE case_id = _case_id;
  bal := public.ledger_balance_as_of(_case_id, CURRENT_DATE);
  SELECT firm_id INTO f_id FROM public.counsel WHERE id = _counsel_id;

  INSERT INTO public.referral_packets
    (case_id, version, status, counsel_id, firm_id, balance_as_of, balance_amount, notes,
     issued_at, issued_by, created_by, snapshot)
  VALUES (_case_id, next_version, 'issued', _counsel_id, f_id, CURRENT_DATE, bal, _notes,
     now(), uid, uid,
     jsonb_build_object(
       'case', to_jsonb(c),
       'balance_amount', bal,
       'notices', (SELECT COALESCE(jsonb_agg(to_jsonb(n)), '[]'::jsonb) FROM public.notices n WHERE n.case_id = _case_id),
       'ledger', (SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.entry_date), '[]'::jsonb) FROM public.ledger_entries l WHERE l.case_id = _case_id),
       'generated_at', now()))
  RETURNING * INTO p;

  UPDATE public.referral_packets
     SET status = 'superseded', superseded_at = now(), superseded_by_packet_id = p.id
   WHERE case_id = _case_id AND id <> p.id AND status IN ('draft','issued','approved','invalidated');

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, is_internal, created_by)
  VALUES (_case_id, 'referral_packet_issued', format('Referral packet v%s issued', next_version), _notes,
          jsonb_build_object('packet_id', p.id, 'version', next_version, 'counsel_id', _counsel_id,
                             'balance_amount', bal), false, uid);

  RETURN to_jsonb(p);
END $$;

-- ========== 4. Hard vs soft change classification ==========
DO $$ BEGIN
  CREATE TYPE public.matter_change_class AS ENUM ('hard','soft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.matter_change_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_key text NOT NULL UNIQUE,
  label text NOT NULL,
  change_class public.matter_change_class NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matter_change_rules TO authenticated;
GRANT ALL ON public.matter_change_rules TO service_role;
ALTER TABLE public.matter_change_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read matter_change_rules" ON public.matter_change_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage matter_change_rules" ON public.matter_change_rules
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_matter_change_rules_updated_at
  BEFORE UPDATE ON public.matter_change_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.matter_change_rules (change_key, label, change_class, description) VALUES
  ('ledger_amount_changed','Ledger amount changed','hard','Charges, payments or credits changed the amount demanded'),
  ('notice_replaced','Notice replaced or withdrawn','hard','The predicate notice was reissued or withdrawn'),
  ('notice_service_changed','Notice service details changed','hard','Served date or service method changed, moving statutory deadlines'),
  ('tenant_identity_changed','Tenant identity changed','hard','Primary tenant or named parties changed'),
  ('parties_changed','Parties added or removed','hard','Additional occupants or respondents changed'),
  ('property_changed','Property or unit changed','hard','The premises identified in the matter changed'),
  ('matter_type_changed','Matter type changed','hard','Routing between nonpayment, holdover or other type'),
  ('jurisdiction_changed','Jurisdiction changed','hard','Court state or county changed'),
  ('contact_info_updated','Contact details updated','soft','Phone, email or mailing details updated'),
  ('document_added','Document added','soft','A supporting document was uploaded'),
  ('note_added','Note added','soft','A note was added to the matter'),
  ('payment_recorded','Payment recorded','soft','A payment was logged without changing the demand'),
  ('task_completed','Task completed','soft','An internal task was completed'),
  ('payment_plan_updated','Payment plan updated','soft','Installment schedule changed')
ON CONFLICT (change_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.matter_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  packet_id uuid REFERENCES public.referral_packets(id) ON DELETE SET NULL,
  change_key text NOT NULL,
  change_class public.matter_change_class NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  invalidated_approval boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matter_change_events_case ON public.matter_change_events(case_id);

GRANT SELECT, INSERT ON public.matter_change_events TO authenticated;
GRANT ALL ON public.matter_change_events TO service_role;
ALTER TABLE public.matter_change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access matter_change_events" ON public.matter_change_events
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Attorneys view assigned matter_change_events" ON public.matter_change_events
  FOR SELECT TO authenticated USING (public.attorney_can_access_case(case_id));

CREATE OR REPLACE FUNCTION public.record_matter_change(
  _case_id uuid,
  _change_key text,
  _detail text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    UPDATE public.cases
       SET confirmed_eligible_to_file_date = NULL,
           eligibility_confirmed_by = NULL,
           eligibility_confirmed_at = NULL,
           confirmation_notes = NULL,
           updated_at = now()
     WHERE id = _case_id;

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

  RETURN jsonb_build_object('event_id', ev_id, 'change_class', klass,
                            'packet_id', p.id, 'invalidated_approval', invalidated);
END $$;