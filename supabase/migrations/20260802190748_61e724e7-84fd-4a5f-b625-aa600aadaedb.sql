ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_charge_type_check;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_charge_type_check
  CHECK (charge_type = ANY (ARRAY['rent','late_fee','legal_fee','court_cost','damages','cleaning','utilities','nsf_fee','other','payment','credit']));

CREATE OR REPLACE FUNCTION public.validate_ledger_entry_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_date < DATE '2000-01-01' OR NEW.entry_date > (CURRENT_DATE + INTERVAL '1 year') THEN
    RAISE EXCEPTION 'Ledger entry date % is out of range (must be between 2000-01-01 and one year from today)', NEW.entry_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ledger_entry_date ON public.ledger_entries;
CREATE TRIGGER trg_validate_ledger_entry_date
  BEFORE INSERT OR UPDATE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_ledger_entry_date();

CREATE OR REPLACE FUNCTION public.save_ledger(_case_id uuid, _lines jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _line jsonb;
  _idx int := 0;
  _charges numeric := 0;
  _payments numeric := 0;
  _balance numeric := 0;
  _count int := 0;
  _amount numeric;
  _pay numeric;
  _credit numeric;
  _type text;
  _date date;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.is_draft_matter_owner(_case_id)) THEN
    RAISE EXCEPTION 'Not authorized to edit this ledger';
  END IF;

  IF jsonb_typeof(_lines) <> 'array' THEN
    RAISE EXCEPTION 'Ledger lines must be a list';
  END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _idx := _idx + 1;
    _type := COALESCE(NULLIF(_line->>'charge_type',''), 'rent');
    _amount := COALESCE((_line->>'amount')::numeric, 0);
    _pay := COALESCE((_line->>'payment_amount')::numeric, 0);
    _credit := COALESCE((_line->>'credit_amount')::numeric, 0);

    IF (_line->>'entry_date') IS NULL OR _line->>'entry_date' = '' THEN
      RAISE EXCEPTION 'Line %: a date is required', _idx;
    END IF;
    _date := (_line->>'entry_date')::date;

    IF _date < DATE '2000-01-01' OR _date > (CURRENT_DATE + INTERVAL '1 year') THEN
      RAISE EXCEPTION 'Line %: date % is out of range', _idx, _date;
    END IF;
    IF _amount < 0 OR _pay < 0 OR _credit < 0 THEN
      RAISE EXCEPTION 'Line %: amounts cannot be negative', _idx;
    END IF;
    IF _amount = 0 AND _pay = 0 AND _credit = 0 THEN
      RAISE EXCEPTION 'Line %: enter a charge, payment or credit amount', _idx;
    END IF;
    IF _type NOT IN ('rent','late_fee','legal_fee','court_cost','damages','cleaning','utilities','nsf_fee','other','payment','credit') THEN
      RAISE EXCEPTION 'Line %: "%" is not a valid ledger line type', _idx, _type;
    END IF;

    _charges := _charges + _amount;
    _payments := _payments + _pay + _credit;
  END LOOP;

  _count := _idx;
  _balance := _charges - _payments;
  IF _balance < 0 THEN
    RAISE EXCEPTION 'Payments and credits exceed charges — the ledger balance cannot be negative';
  END IF;

  DELETE FROM public.ledger_entries WHERE case_id = _case_id;

  INSERT INTO public.ledger_entries (case_id, entry_date, charge_type, description, amount, payment_amount, credit_amount, sort_order, created_by)
  SELECT
    _case_id,
    (l->>'entry_date')::date,
    COALESCE(NULLIF(l->>'charge_type',''), 'rent'),
    NULLIF(l->>'description',''),
    COALESCE((l->>'amount')::numeric, 0),
    COALESCE((l->>'payment_amount')::numeric, 0),
    COALESCE((l->>'credit_amount')::numeric, 0),
    (ord - 1)::int,
    auth.uid()
  FROM jsonb_array_elements(_lines) WITH ORDINALITY AS t(l, ord);

  UPDATE public.cases SET current_balance = _balance, updated_at = now() WHERE id = _case_id;

  INSERT INTO public.matter_events (case_id, event_key, label, detail, metadata, created_by)
  VALUES (
    _case_id,
    'ledger_updated',
    'Rent ledger updated',
    _count || ' line(s) saved — balance ' || to_char(_balance, 'FM$999,999,990.00'),
    jsonb_build_object('charges', _charges, 'payments', _payments, 'balance', _balance, 'lines', _count),
    auth.uid()
  );

  RETURN jsonb_build_object('charges', _charges, 'payments', _payments, 'balance', _balance, 'lines', _count);
END;
$$;

REVOKE ALL ON FUNCTION public.save_ledger(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.save_ledger(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_ledger(uuid, jsonb) TO service_role;