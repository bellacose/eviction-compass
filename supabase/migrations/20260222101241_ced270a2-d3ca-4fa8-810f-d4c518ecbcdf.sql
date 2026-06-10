
-- ===========================================
-- Evict OS Database Schema - Full Migration
-- ===========================================

-- ========== ENUM TYPES ==========

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'client');

CREATE TYPE public.case_status AS ENUM (
  'intake', 'notice_preparation', 'notice_served', 'waiting_period',
  'ready_to_file', 'filed', 'court_scheduled', 'in_court_process',
  'outcome_pending', 'resolved', 'closed', 'on_hold'
);

CREATE TYPE public.case_priority AS ENUM ('low', 'normal', 'high');

CREATE TYPE public.milestone_status AS ENUM ('pending', 'complete', 'overdue', 'skipped');

CREATE TYPE public.document_category AS ENUM (
  'lease', 'rent_ledger', 'notice', 'proof_of_service', 'petition_filing',
  'court_document', 'photo', 'correspondence', 'other'
);

CREATE TYPE public.service_method AS ENUM (
  'personal', 'substituted', 'conspicuous_nail_mail', 'certified_mail', 'other'
);

CREATE TYPE public.court_event_type AS ENUM (
  'hearing', 'adjournment', 'judgment', 'warrant', 'other'
);

CREATE TYPE public.note_type AS ENUM ('internal', 'client_update');

CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email');

CREATE TYPE public.notification_status AS ENUM ('queued', 'sent', 'failed', 'read');

-- ========== TABLES ==========

-- 1. clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT DEFAULT 'NY',
  zip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. user_roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL DEFAULT 'Buffalo',
  state TEXT NOT NULL DEFAULT 'NY',
  zip TEXT,
  county TEXT DEFAULT 'Erie',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  mailing_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. case_number sequence
CREATE SEQUENCE public.case_number_seq START 1;

-- 7. cases
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE DEFAULT 'EV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.case_number_seq')::text, 4, '0'),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  primary_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  case_type TEXT NOT NULL DEFAULT 'nonpayment',
  jurisdiction_state TEXT NOT NULL DEFAULT 'NY',
  jurisdiction_county TEXT NOT NULL DEFAULT 'Erie',
  court_name TEXT,
  court_address TEXT,
  court_case_number TEXT,
  status public.case_status NOT NULL DEFAULT 'intake',
  sub_status TEXT,
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_date DATE,
  priority public.case_priority NOT NULL DEFAULT 'normal',
  is_on_hold BOOLEAN NOT NULL DEFAULT false,
  hold_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. case_tenants
CREATE TABLE public.case_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. milestone_templates
CREATE TABLE public.milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  jurisdiction_state TEXT NOT NULL DEFAULT 'NY',
  jurisdiction_county TEXT NOT NULL DEFAULT 'Erie',
  case_type TEXT NOT NULL DEFAULT 'nonpayment',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. milestone_template_items
CREATE TABLE public.milestone_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.milestone_templates(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  auto_offset_days INTEGER,
  default_client_visible BOOLEAN NOT NULL DEFAULT true,
  required_document_category public.document_category,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. case_milestones
CREATE TABLE public.case_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  category public.document_category NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  version_number INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. service_records
CREATE TABLE public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  notice_type TEXT DEFAULT '14-day demand',
  service_method public.service_method,
  service_date DATE,
  service_time TIME,
  served_by TEXT,
  mailing_tracking_number TEXT,
  affidavit_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. court_events
CREATE TABLE public.court_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type public.court_event_type NOT NULL DEFAULT 'hearing',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  court_name TEXT,
  location TEXT,
  virtual_link TEXT,
  outcome TEXT,
  notes TEXT,
  next_event_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. case_notes
CREATE TABLE public.case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  note_type public.note_type NOT NULL DEFAULT 'internal',
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. activity_log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value_json JSONB,
  new_value_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  status public.notification_status NOT NULL DEFAULT 'queued',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. system_settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value_json JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== SECURITY DEFINER FUNCTION ==========

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Helper: get client_id for a user
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = _user_id
$$;

-- ========== PROFILE AUTO-CREATION TRIGGER ==========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== UPDATED_AT TRIGGER ==========

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_milestone_templates_updated_at BEFORE UPDATE ON public.milestone_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_milestone_template_items_updated_at BEFORE UPDATE ON public.milestone_template_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_case_milestones_updated_at BEFORE UPDATE ON public.case_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON public.service_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_court_events_updated_at BEFORE UPDATE ON public.court_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_case_notes_updated_at BEFORE UPDATE ON public.case_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== ROW LEVEL SECURITY ==========

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR id = auth.uid());

-- ===== USER_ROLES =====
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ===== CLIENTS =====
CREATE POLICY "Admins full access clients" ON public.clients FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own org" ON public.clients FOR SELECT TO authenticated USING (id = public.get_user_client_id(auth.uid()));

-- ===== PROPERTIES =====
CREATE POLICY "Admins full access properties" ON public.properties FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own properties" ON public.properties FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));

-- ===== TENANTS =====
CREATE POLICY "Admins full access tenants" ON public.tenants FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view tenants on their cases" ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.primary_tenant_id = tenants.id
    AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== CASES =====
CREATE POLICY "Admins full access cases" ON public.cases FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own cases" ON public.cases FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));

-- ===== CASE_TENANTS =====
CREATE POLICY "Admins full access case_tenants" ON public.case_tenants FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own case_tenants" ON public.case_tenants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_tenants.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== MILESTONE_TEMPLATES =====
CREATE POLICY "Admins full access templates" ON public.milestone_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can read active templates" ON public.milestone_templates FOR SELECT TO authenticated USING (is_active = true);

-- ===== MILESTONE_TEMPLATE_ITEMS =====
CREATE POLICY "Admins full access template items" ON public.milestone_template_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can read template items" ON public.milestone_template_items FOR SELECT TO authenticated USING (true);

-- ===== CASE_MILESTONES =====
CREATE POLICY "Admins full access milestones" ON public.case_milestones FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view visible milestones" ON public.case_milestones FOR SELECT TO authenticated
  USING (client_visible = true AND EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_milestones.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== DOCUMENTS =====
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view visible documents" ON public.documents FOR SELECT TO authenticated
  USING (visible_to_client = true AND EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = documents.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== SERVICE_RECORDS =====
CREATE POLICY "Admins full access service_records" ON public.service_records FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own service_records" ON public.service_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = service_records.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== COURT_EVENTS =====
CREATE POLICY "Admins full access court_events" ON public.court_events FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own court_events" ON public.court_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = court_events.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== CASE_NOTES =====
CREATE POLICY "Admins full access notes" ON public.case_notes FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view client updates only" ON public.case_notes FOR SELECT TO authenticated
  USING (note_type = 'client_update' AND EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = case_notes.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== ACTIVITY_LOG =====
CREATE POLICY "Admins full access activity" ON public.activity_log FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own case activity" ON public.activity_log FOR SELECT TO authenticated
  USING (case_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.cases c WHERE c.id = activity_log.case_id AND c.client_id = public.get_user_client_id(auth.uid())
  ));

-- ===== NOTIFICATIONS =====
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid());

-- ===== SYSTEM_SETTINGS =====
CREATE POLICY "Admins full access settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

-- ========== STORAGE BUCKET ==========

INSERT INTO storage.buckets (id, name, public) VALUES ('case-documents', 'case-documents', false);

CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'case-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'case-documents' AND public.is_admin(auth.uid()));

-- Clients can view docs in their client folder (path starts with client/{client_id}/)
CREATE POLICY "Clients can view own documents" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = 'client'
    AND (storage.foldername(name))[2] = public.get_user_client_id(auth.uid())::text
  );
