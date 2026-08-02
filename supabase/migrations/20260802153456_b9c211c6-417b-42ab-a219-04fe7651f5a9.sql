-- 1. attorney role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attorney';

-- 2. attorney status enum
DO $$ BEGIN
  CREATE TYPE public.attorney_status AS ENUM ('invited','active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.firm_member_role AS ENUM ('member','firm_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. firms
CREATE TABLE IF NOT EXISTS public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  jurisdictions text[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firms TO authenticated;
GRANT ALL ON public.firms TO service_role;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access firms" ON public.firms
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. counsel principal fields
ALTER TABLE public.counsel
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.attorney_status NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS is_firm_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bar_jurisdictions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- existing rows: active contacts without portal access stay 'inactive' principals
UPDATE public.counsel SET status = 'inactive' WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_counsel_user_id ON public.counsel(user_id);
CREATE INDEX IF NOT EXISTS idx_counsel_firm_id ON public.counsel(firm_id);

-- 5. firm membership
CREATE TABLE IF NOT EXISTS public.firm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  counsel_id uuid NOT NULL REFERENCES public.counsel(id) ON DELETE CASCADE,
  member_role public.firm_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, counsel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_members TO authenticated;
GRANT ALL ON public.firm_members TO service_role;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access firm_members" ON public.firm_members
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_firm_members_updated_at BEFORE UPDATE ON public.firm_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. assignment scope on case_counsel
ALTER TABLE public.case_counsel
  ADD COLUMN IF NOT EXISTS firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allow_firm_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unassigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_case_counsel_counsel ON public.case_counsel(counsel_id);
CREATE INDEX IF NOT EXISTS idx_case_counsel_firm ON public.case_counsel(firm_id);