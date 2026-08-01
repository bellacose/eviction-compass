CREATE TYPE public.notice_kind AS ENUM ('five_day_late','fourteen_day_demand','notice_to_quit','other');
CREATE TYPE public.notice_status AS ENUM ('draft','issued','served','cure_running','ripe','cured','withdrawn');

CREATE TABLE public.notice_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_state text NOT NULL,
  jurisdiction_county text NOT NULL DEFAULT '*',
  notice_kind public.notice_kind NOT NULL,
  cure_days integer NOT NULL DEFAULT 14,
  count_business_days boolean NOT NULL DEFAULT false,
  mailing_days_json jsonb NOT NULL DEFAULT '{"certified_mail":5,"other":0}'::jsonb,
  min_days_before_filing integer NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction_state, jurisdiction_county, notice_kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notice_rules TO authenticated;
GRANT ALL ON public.notice_rules TO service_role;
ALTER TABLE public.notice_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notice rules" ON public.notice_rules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_notice_rules_updated_at BEFORE UPDATE ON public.notice_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  notice_kind public.notice_kind NOT NULL,
  status public.notice_status NOT NULL DEFAULT 'draft',
  amount_demanded numeric(12,2) NOT NULL DEFAULT 0,
  computed_amount numeric(12,2),
  amount_overridden boolean NOT NULL DEFAULT false,
  period_through date,
  prepared_date date NOT NULL DEFAULT CURRENT_DATE,
  prepared_by uuid REFERENCES public.profiles(id),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  served_date date,
  service_method public.service_method,
  cure_by_date date,
  eligible_to_file_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notices_case ON public.notices(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notices" ON public.notices FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view notices on own matters" ON public.notices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = notices.case_id
                 AND public.owns_client(c.client_id)));

CREATE POLICY "Clients create notices on own drafts" ON public.notices FOR INSERT TO authenticated
  WITH CHECK (public.is_draft_matter_owner(case_id));

CREATE POLICY "Clients edit notices on own drafts" ON public.notices FOR UPDATE TO authenticated
  USING (public.is_draft_matter_owner(case_id)) WITH CHECK (public.is_draft_matter_owner(case_id));

CREATE POLICY "Clients delete notices on own drafts" ON public.notices FOR DELETE TO authenticated
  USING (public.is_draft_matter_owner(case_id));

CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES public.notices(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.ledger_balance_as_of(_case_id uuid, _as_of date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount - COALESCE(payment_amount,0) - COALESCE(credit_amount,0)), 0)::numeric
  FROM public.ledger_entries
  WHERE case_id = _case_id AND entry_date <= _as_of
$$;

CREATE OR REPLACE FUNCTION public.add_days_skip_weekends(_start date, _days integer)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE d date := _start; remaining integer := GREATEST(_days, 0);
BEGIN
  WHILE remaining > 0 LOOP
    d := d + 1;
    IF EXTRACT(ISODOW FROM d) < 6 THEN remaining := remaining - 1; END IF;
  END LOOP;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.calc_notice_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.cases;
  r public.notice_rules;
  mail_days integer := 0;
  base date;
BEGIN
  IF NEW.served_date IS NULL THEN
    NEW.cure_by_date := NULL;
    NEW.eligible_to_file_date := NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO c FROM public.cases WHERE id = NEW.case_id;

  SELECT * INTO r FROM public.notice_rules
   WHERE is_active
     AND notice_kind = NEW.notice_kind
     AND jurisdiction_state = COALESCE(c.jurisdiction_state, '')
     AND jurisdiction_county IN (COALESCE(c.jurisdiction_county, ''), '*')
   ORDER BY (jurisdiction_county <> '*') DESC
   LIMIT 1;

  IF r IS NULL THEN
    SELECT * INTO r FROM public.notice_rules
     WHERE is_active AND notice_kind = NEW.notice_kind AND jurisdiction_state = '*'
     LIMIT 1;
  END IF;

  IF r IS NULL THEN
    NEW.cure_by_date := NULL;
    NEW.eligible_to_file_date := NULL;
    RETURN NEW;
  END IF;

  mail_days := COALESCE((r.mailing_days_json ->> COALESCE(NEW.service_method::text, 'other'))::int,
                        (r.mailing_days_json ->> 'other')::int, 0);
  base := NEW.served_date + mail_days;

  IF r.count_business_days THEN
    NEW.cure_by_date := public.add_days_skip_weekends(base, r.cure_days);
  ELSE
    NEW.cure_by_date := base + r.cure_days;
  END IF;

  NEW.eligible_to_file_date := NEW.cure_by_date + GREATEST(COALESCE(r.min_days_before_filing,0), 0) + 1;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notices_deadlines BEFORE INSERT OR UPDATE OF served_date, service_method, notice_kind, case_id
  ON public.notices FOR EACH ROW EXECUTE FUNCTION public.calc_notice_deadlines();

INSERT INTO public.notice_rules (jurisdiction_state, jurisdiction_county, notice_kind, cure_days, count_business_days, mailing_days_json, min_days_before_filing, notes)
VALUES
 ('NY','Erie','five_day_late',5,false,'{"certified_mail":5,"personal":0,"substituted":0,"conspicuous_nail_mail":0,"other":0}'::jsonb,0,'NY RPL 235-e(d) late rent notice'),
 ('NY','Erie','fourteen_day_demand',14,false,'{"certified_mail":5,"personal":0,"substituted":0,"conspicuous_nail_mail":0,"other":0}'::jsonb,0,'RPAPL 711(2) 14-day rent demand'),
 ('NY','*','five_day_late',5,false,'{"certified_mail":5,"other":0}'::jsonb,0,'NY statewide default'),
 ('NY','*','fourteen_day_demand',14,false,'{"certified_mail":5,"other":0}'::jsonb,0,'NY statewide default'),
 ('NY','*','notice_to_quit',10,false,'{"certified_mail":5,"other":0}'::jsonb,0,'NY statewide default');