
-- ENUMS
CREATE TYPE public.debtor_type AS ENUM ('tenant','contractor','vendor','process_server','other');
CREATE TYPE public.collection_origin AS ENUM ('money_judgment','case_closed_balance','skip_tenant','manual','vendor_debt');
CREATE TYPE public.collection_status AS ENUM ('open','in_house','placed_with_agency','judgment_sold','in_enforcement','settled','written_off','paid');
CREATE TYPE public.collection_activity_type AS ENUM ('note','call','letter','email','demand','payment_received','agency_placement','judgment_sale','enforcement','status_change','other');
CREATE TYPE public.collection_payment_type AS ENUM ('payment','adjustment','write_off','commission','court_cost_recovery','interest_adjustment');
CREATE TYPE public.enforcement_type AS ENUM ('wage_garnishment','bank_levy','property_lien','income_execution','restraining_notice','other');
CREATE TYPE public.enforcement_status AS ENUM ('drafted','filed','served','active','satisfied','released','closed');

-- DEBTORS
CREATE TABLE public.debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  debtor_type public.debtor_type NOT NULL DEFAULT 'tenant',
  full_name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address_line1 text,
  city text, state text, zip text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ssn_last4 text,
  dob date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debtors TO authenticated;
GRANT ALL ON public.debtors TO service_role;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage debtors" ON public.debtors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own debtors" ON public.debtors FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- AGENCIES
CREATE TABLE public.collection_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address_line1 text,
  city text, state text, zip text,
  default_commission_pct numeric(5,2) DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_agencies TO authenticated;
GRANT ALL ON public.collection_agencies TO service_role;
ALTER TABLE public.collection_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage agencies" ON public.collection_agencies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read agencies" ON public.collection_agencies FOR SELECT TO authenticated
  USING (true);

-- MATTERS
CREATE TABLE public.collection_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_number text UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  debtor_id uuid NOT NULL REFERENCES public.debtors(id) ON DELETE RESTRICT,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  origin public.collection_origin NOT NULL DEFAULT 'manual',
  status public.collection_status NOT NULL DEFAULT 'open',
  principal numeric(12,2) NOT NULL DEFAULT 0,
  court_costs numeric(12,2) NOT NULL DEFAULT 0,
  legal_fees numeric(12,2) NOT NULL DEFAULT 0,
  interest_rate numeric(5,2) NOT NULL DEFAULT 9.00,
  interest_start_date date NOT NULL DEFAULT CURRENT_DATE,
  judgment_date date,
  agency_id uuid REFERENCES public.collection_agencies(id) ON DELETE SET NULL,
  agency_placed_at timestamptz,
  agency_commission_pct numeric(5,2),
  sold_to text,
  sold_at date,
  sold_price numeric(12,2),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_matters TO authenticated;
GRANT ALL ON public.collection_matters TO service_role;
ALTER TABLE public.collection_matters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage matters" ON public.collection_matters FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own matters" ON public.collection_matters FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- ACTIVITIES
CREATE TABLE public.collection_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.collection_matters(id) ON DELETE CASCADE,
  activity_type public.collection_activity_type NOT NULL DEFAULT 'note',
  activity_at timestamptz NOT NULL DEFAULT now(),
  content text,
  is_internal boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_activities TO authenticated;
GRANT ALL ON public.collection_activities TO service_role;
ALTER TABLE public.collection_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage activities" ON public.collection_activities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read non-internal activities" ON public.collection_activities FOR SELECT TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.collection_matters m
      WHERE m.id = matter_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

-- PAYMENTS
CREATE TABLE public.collection_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.collection_matters(id) ON DELETE CASCADE,
  payment_type public.collection_payment_type NOT NULL DEFAULT 'payment',
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_payments TO authenticated;
GRANT ALL ON public.collection_payments TO service_role;
ALTER TABLE public.collection_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage cpayments" ON public.collection_payments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own cpayments" ON public.collection_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_matters m
      WHERE m.id = matter_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

-- ENFORCEMENT
CREATE TABLE public.enforcement_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.collection_matters(id) ON DELETE CASCADE,
  action_type public.enforcement_type NOT NULL,
  status public.enforcement_status NOT NULL DEFAULT 'drafted',
  filed_date date,
  served_date date,
  target_name text,
  target_address text,
  amount numeric(12,2),
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enforcement_actions TO authenticated;
GRANT ALL ON public.enforcement_actions TO service_role;
ALTER TABLE public.enforcement_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage enforcement" ON public.enforcement_actions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "clients read own enforcement" ON public.enforcement_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_matters m
      WHERE m.id = matter_id AND m.client_id = public.get_user_client_id(auth.uid())
    )
  );

-- updated_at triggers
CREATE TRIGGER tg_debtors_updated BEFORE UPDATE ON public.debtors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_cagencies_updated BEFORE UPDATE ON public.collection_agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_cmatters_updated BEFORE UPDATE ON public.collection_matters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_enforcement_updated BEFORE UPDATE ON public.enforcement_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: balance calculation
CREATE OR REPLACE FUNCTION public.collection_matter_balance(_matter_id uuid)
RETURNS TABLE (
  principal numeric, court_costs numeric, legal_fees numeric,
  accrued_interest numeric, payments_total numeric, write_offs_total numeric,
  balance_due numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.collection_matters;
  days int;
  accrued numeric;
  paid numeric;
  wo numeric;
BEGIN
  SELECT * INTO m FROM public.collection_matters WHERE id = _matter_id;
  IF m IS NULL THEN RETURN; END IF;
  days := GREATEST(0, (CURRENT_DATE - m.interest_start_date));
  accrued := ROUND(m.principal * (m.interest_rate/100.0) * days / 365.0, 2);
  SELECT COALESCE(SUM(amount),0) INTO paid FROM public.collection_payments
    WHERE matter_id=_matter_id AND payment_type IN ('payment','court_cost_recovery');
  SELECT COALESCE(SUM(amount),0) INTO wo FROM public.collection_payments
    WHERE matter_id=_matter_id AND payment_type IN ('write_off','adjustment');
  principal := m.principal;
  court_costs := m.court_costs;
  legal_fees := m.legal_fees;
  accrued_interest := accrued;
  payments_total := paid;
  write_offs_total := wo;
  balance_due := m.principal + m.court_costs + m.legal_fees + accrued - paid - wo;
  RETURN NEXT;
END $$;

-- Matter-number generator
CREATE OR REPLACE FUNCTION public.collection_matter_set_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.matter_number IS NULL THEN
    NEW.matter_number := 'COL-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*100000))::int::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_cmatter_number BEFORE INSERT ON public.collection_matters
  FOR EACH ROW EXECUTE FUNCTION public.collection_matter_set_number();

-- Auto-create matter when money judgment milestone completes
CREATE OR REPLACE FUNCTION public.auto_create_collection_from_judgment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cases; d_id uuid; tenant_name text; tenant_row public.tenants;
BEGIN
  IF NEW.status = 'complete' AND (OLD.status IS DISTINCT FROM 'complete')
     AND NEW.milestone_key IN ('money_judgment','judgment_entered','judgment') THEN
    SELECT * INTO c FROM public.cases WHERE id = NEW.case_id;
    IF c IS NULL THEN RETURN NEW; END IF;
    -- Avoid duplicate
    IF EXISTS (SELECT 1 FROM public.collection_matters WHERE case_id = c.id AND origin='money_judgment') THEN
      RETURN NEW;
    END IF;
    SELECT * INTO tenant_row FROM public.tenants WHERE id = c.primary_tenant_id;
    INSERT INTO public.debtors (client_id, debtor_type, full_name, tenant_id, created_by)
    VALUES (c.client_id, 'tenant', COALESCE(tenant_row.full_name,'Unknown Tenant'), c.primary_tenant_id, NEW.completed_by)
    RETURNING id INTO d_id;
    INSERT INTO public.collection_matters
      (client_id, debtor_id, case_id, origin, status, principal, interest_start_date, judgment_date, created_by)
    VALUES (c.client_id, d_id, c.id, 'money_judgment', 'open', 0, COALESCE(NEW.completed_at::date, CURRENT_DATE), COALESCE(NEW.completed_at::date, CURRENT_DATE), NEW.completed_by);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_milestone_to_collection
AFTER UPDATE ON public.case_milestones
FOR EACH ROW EXECUTE FUNCTION public.auto_create_collection_from_judgment();
