
-- Enums
CREATE TYPE public.payment_frequency AS ENUM ('weekly','biweekly','monthly');
CREATE TYPE public.payment_plan_status AS ENUM ('active','completed','cancelled','defaulted');
CREATE TYPE public.scheduled_payment_status AS ENUM ('scheduled','paid','partial','missed','cancelled');

-- payment_plans
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  frequency public.payment_frequency NOT NULL DEFAULT 'monthly',
  installment_count int NOT NULL CHECK (installment_count > 0),
  installment_amount numeric(12,2) NOT NULL CHECK (installment_amount >= 0),
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status public.payment_plan_status NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT ALL ON public.payment_plans TO service_role;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment plans"
ON public.payment_plans FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients read own payment plans"
ON public.payment_plans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = payment_plans.case_id
      AND c.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE TRIGGER trg_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- scheduled_payments
CREATE TABLE public.scheduled_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  payment_plan_id uuid REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  amount_due numeric(12,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  paid_date date,
  status public.scheduled_payment_status NOT NULL DEFAULT 'scheduled',
  method text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_payments TO authenticated;
GRANT ALL ON public.scheduled_payments TO service_role;
ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled payments"
ON public.scheduled_payments FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients read own scheduled payments"
ON public.scheduled_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = scheduled_payments.case_id
      AND c.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE TRIGGER trg_scheduled_payments_updated_at
BEFORE UPDATE ON public.scheduled_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_scheduled_payments_due_date ON public.scheduled_payments(due_date);
CREATE INDEX idx_scheduled_payments_case_id ON public.scheduled_payments(case_id);
CREATE INDEX idx_scheduled_payments_plan_id ON public.scheduled_payments(payment_plan_id);
CREATE INDEX idx_payment_plans_case_id ON public.payment_plans(case_id);

-- Auto-generate installments
CREATE OR REPLACE FUNCTION public.generate_payment_plan_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int;
  d date;
  step interval;
BEGIN
  step := CASE NEW.frequency
    WHEN 'weekly' THEN interval '7 days'
    WHEN 'biweekly' THEN interval '14 days'
    WHEN 'monthly' THEN interval '1 month'
  END;

  IF NEW.total_amount = 0 THEN
    NEW.total_amount := NEW.installment_amount * NEW.installment_count;
  END IF;

  FOR i IN 0..(NEW.installment_count - 1) LOOP
    d := (NEW.start_date::timestamp + (step * i))::date;
    INSERT INTO public.scheduled_payments
      (case_id, payment_plan_id, due_date, amount_due, status, created_by)
    VALUES
      (NEW.case_id, NEW.id, d, NEW.installment_amount, 'scheduled', NEW.created_by);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_installments
AFTER INSERT ON public.payment_plans
FOR EACH ROW EXECUTE FUNCTION public.generate_payment_plan_installments();
