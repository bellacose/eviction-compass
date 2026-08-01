-- ============ ENUM ADDITIONS ============
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'attorney_review';

DO $$ BEGIN
  CREATE TYPE public.occupancy_status AS ENUM ('current_tenant','former_tenant','evicted','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.matter_type AS ENUM ('non_payment','holdover','lease_violation','former_tenant_collection','judgment_collection','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_draft_matter_owner(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = _case_id
      AND c.status::text = 'draft'
      AND c.client_id = public.get_user_client_id(auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _client_id IS NOT NULL AND _client_id = public.get_user_client_id(auth.uid())
$$;

-- ============ UNITS ============
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  description text,
  bedrooms numeric,
  bathrooms numeric,
  monthly_rent numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS units_property_idx ON public.units(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access units" ON public.units
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own units" ON public.units
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = units.property_id AND p.client_id = public.get_user_client_id(auth.uid()))
  );

CREATE POLICY "Clients create own units" ON public.units
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = units.property_id AND p.client_id = public.get_user_client_id(auth.uid()))
  );

CREATE POLICY "Clients update own units" ON public.units
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = units.property_id AND p.client_id = public.get_user_client_id(auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = units.property_id AND p.client_id = public.get_user_client_id(auth.uid()))
  );

CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TENANCIES ============
CREATE TABLE IF NOT EXISTS public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_start date,
  lease_end date,
  lease_type text,
  monthly_rent numeric,
  security_deposit numeric,
  occupancy_status public.occupancy_status NOT NULL DEFAULT 'current_tenant',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenancies_client_idx ON public.tenancies(client_id);
CREATE INDEX IF NOT EXISTS tenancies_unit_idx ON public.tenancies(unit_id);
CREATE INDEX IF NOT EXISTS tenancies_tenant_idx ON public.tenancies(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancies TO authenticated;
GRANT ALL ON public.tenancies TO service_role;
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access tenancies" ON public.tenancies
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own tenancies" ON public.tenancies
  FOR SELECT TO authenticated USING (public.owns_client(client_id));

CREATE POLICY "Clients create own tenancies" ON public.tenancies
  FOR INSERT TO authenticated WITH CHECK (public.owns_client(client_id));

CREATE POLICY "Clients update own tenancies" ON public.tenancies
  FOR UPDATE TO authenticated USING (public.owns_client(client_id)) WITH CHECK (public.owns_client(client_id));

CREATE TRIGGER tenancies_updated_at BEFORE UPDATE ON public.tenancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MATTER EVENTS (TIMELINE) ============
CREATE TABLE IF NOT EXISTS public.matter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  label text NOT NULL,
  detail text,
  metadata jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_events_case_idx ON public.matter_events(case_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.matter_events TO authenticated;
GRANT ALL ON public.matter_events TO service_role;
ALTER TABLE public.matter_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access matter events" ON public.matter_events
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own non-internal events" ON public.matter_events
  FOR SELECT TO authenticated USING (
    is_internal = false AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = matter_events.case_id AND c.client_id = public.get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Clients log events on own matters" ON public.matter_events
  FOR INSERT TO authenticated WITH CHECK (
    is_internal = false AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = matter_events.case_id AND c.client_id = public.get_user_client_id(auth.uid())
    )
  );

-- ============ CASES: NEW COLUMNS ============
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matter_type public.matter_type,
  ADD COLUMN IF NOT EXISTS first_unpaid_month date,
  ADD COLUMN IF NOT EXISTS last_payment_date date,
  ADD COLUMN IF NOT EXISTS current_balance numeric,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS intake_step integer,
  ADD COLUMN IF NOT EXISTS lq_current_occupant boolean,
  ADD COLUMN IF NOT EXISTS lq_tenant_moved boolean,
  ADD COLUMN IF NOT EXISTS lq_known_bankruptcy boolean,
  ADD COLUMN IF NOT EXISTS lq_military_verified boolean,
  ADD COLUMN IF NOT EXISTS lq_attorney_retained boolean,
  ADD COLUMN IF NOT EXISTS lq_judgment_exists boolean,
  ADD COLUMN IF NOT EXISTS lq_collection_agency_involved boolean,
  ADD COLUMN IF NOT EXISTS lq_notes text;

CREATE POLICY "Clients create own draft matters" ON public.cases
  FOR INSERT TO authenticated WITH CHECK (
    public.owns_client(client_id) AND status::text = 'draft'
  );

CREATE POLICY "Clients edit own draft matters" ON public.cases
  FOR UPDATE TO authenticated USING (
    public.owns_client(client_id) AND status::text = 'draft'
  ) WITH CHECK (
    public.owns_client(client_id) AND status::text IN ('draft','attorney_review')
  );

CREATE POLICY "Clients delete own draft matters" ON public.cases
  FOR DELETE TO authenticated USING (
    public.owns_client(client_id) AND status::text = 'draft'
  );

-- ============ TENANTS: RENTAL APPLICATION SECTIONS ============
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS identity_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS employment_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vehicles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tenant_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bank_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS drivers_license jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "Clients create tenants" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (public.get_user_client_id(auth.uid()) IS NOT NULL);

CREATE POLICY "Clients update tenants on their draft matters" ON public.tenants
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.tenant_id = tenants.id AND public.owns_client(t.client_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenancies t
      WHERE t.tenant_id = tenants.id AND public.owns_client(t.client_id)
    )
  );

-- ============ PROPERTIES: CLIENT WRITE ============
CREATE POLICY "Clients create own properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (public.owns_client(client_id));

CREATE POLICY "Clients update own properties" ON public.properties
  FOR UPDATE TO authenticated USING (public.owns_client(client_id)) WITH CHECK (public.owns_client(client_id));

-- ============ CASE_TENANTS: CLIENT WRITE ON DRAFTS ============
CREATE POLICY "Clients link tenants on draft matters" ON public.case_tenants
  FOR INSERT TO authenticated WITH CHECK (public.is_draft_matter_owner(case_id));

CREATE POLICY "Clients unlink tenants on draft matters" ON public.case_tenants
  FOR DELETE TO authenticated USING (public.is_draft_matter_owner(case_id));

-- ============ LEDGER ENTRIES ============
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS payment_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE POLICY "Clients manage ledger on draft matters" ON public.ledger_entries
  FOR ALL TO authenticated
  USING (public.is_draft_matter_owner(case_id))
  WITH CHECK (public.is_draft_matter_owner(case_id));

-- ============ DOCUMENTS: CLIENT UPLOAD ON DRAFTS ============
CREATE POLICY "Clients upload docs on draft matters" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (
    case_id IS NOT NULL AND COALESCE(is_internal, false) = false AND public.is_draft_matter_owner(case_id)
  );

CREATE POLICY "Clients delete own draft docs" ON public.documents
  FOR DELETE TO authenticated USING (
    case_id IS NOT NULL AND COALESCE(is_internal, false) = false AND public.is_draft_matter_owner(case_id)
  );

-- ============ STORAGE: CLIENT UPLOAD FOR DRAFT MATTERS ============
CREATE POLICY "Clients upload draft matter files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = 'intake'
    AND public.get_user_client_id(auth.uid()) IS NOT NULL
  );

CREATE POLICY "Clients read own intake uploads" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = 'intake'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.cases c ON c.id = d.case_id
      WHERE d.file_path = objects.name
        AND c.client_id = public.get_user_client_id(auth.uid())
    )
  );