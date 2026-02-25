
-- Counsel directory (attorneys / law firms)
CREATE TABLE public.counsel (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name text,
  attorney_name text NOT NULL,
  email text,
  phone text,
  bar_number text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_counsel_updated_at
  BEFORE UPDATE ON public.counsel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Case ↔ Counsel assignment
CREATE TABLE public.case_counsel (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  counsel_id uuid NOT NULL REFERENCES public.counsel(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'representing',
  fee_arrangement text,
  retainer_amount numeric,
  notes text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, counsel_id)
);

-- RLS on counsel
ALTER TABLE public.counsel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access counsel"
  ON public.counsel FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Clients view active counsel on their cases"
  ON public.counsel FOR SELECT
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.case_counsel cc
      JOIN public.cases c ON c.id = cc.case_id
      WHERE cc.counsel_id = counsel.id
        AND c.client_id = get_user_client_id(auth.uid())
    )
  );

-- RLS on case_counsel
ALTER TABLE public.case_counsel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access case_counsel"
  ON public.case_counsel FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Clients view own case_counsel"
  ON public.case_counsel FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_counsel.case_id
        AND c.client_id = get_user_client_id(auth.uid())
    )
  );
