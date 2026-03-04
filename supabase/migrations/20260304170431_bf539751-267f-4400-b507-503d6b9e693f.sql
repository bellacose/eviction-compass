
-- Ledger entries for tracking rent charges and late fees per case
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  charge_type text NOT NULL DEFAULT 'rent' CHECK (charge_type IN ('rent', 'late_fee')),
  description text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access ledger"
  ON public.ledger_entries FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Clients can view ledger on their own cases
CREATE POLICY "Clients view own case ledger"
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM cases c WHERE c.id = ledger_entries.case_id AND c.client_id = get_user_client_id(auth.uid())
  ));
