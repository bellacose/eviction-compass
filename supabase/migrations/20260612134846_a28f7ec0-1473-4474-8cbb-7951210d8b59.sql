
-- ============ DEBTORS expansion ============
ALTER TABLE public.debtors
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS ssn_last4 text,
  ADD COLUMN IF NOT EXISTS ein_last4 text,
  ADD COLUMN IF NOT EXISTS drivers_license text,
  ADD COLUMN IF NOT EXISTS dl_state text,
  ADD COLUMN IF NOT EXISTS alias text,
  ADD COLUMN IF NOT EXISTS dba text,
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS email_secondary text,
  ADD COLUMN IF NOT EXISTS mailing_address text,
  ADD COLUMN IF NOT EXISTS forwarding_address text,
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS employer_address text,
  ADD COLUMN IF NOT EXISTS employer_phone text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS pay_frequency text,
  ADD COLUMN IF NOT EXISTS est_wages numeric(12,2),
  ADD COLUMN IF NOT EXISTS wages_period text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_account_type text,
  ADD COLUMN IF NOT EXISTS bank_account_last4 text,
  ADD COLUMN IF NOT EXISTS assets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS co_debtors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skip_trace_status text,
  ADD COLUMN IF NOT EXISTS skip_trace_date date,
  ADD COLUMN IF NOT EXISTS skip_trace_source text,
  ADD COLUMN IF NOT EXISTS bankruptcy_filed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bankruptcy_case_number text,
  ADD COLUMN IF NOT EXISTS bankruptcy_chapter text,
  ADD COLUMN IF NOT EXISTS is_active_military boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS represented_by_attorney boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS debtor_attorney_name text,
  ADD COLUMN IF NOT EXISTS debtor_attorney_phone text,
  ADD COLUMN IF NOT EXISTS cease_and_desist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cease_and_desist_date date,
  ADD COLUMN IF NOT EXISTS notes text;

-- ============ COLLECTION_MATTERS expansion ============
ALTER TABLE public.collection_matters
  ADD COLUMN IF NOT EXISTS judgment_entered_date date,
  ADD COLUMN IF NOT EXISTS judgment_expiration_date date,
  ADD COLUMN IF NOT EXISTS judgment_renewal_date date,
  ADD COLUMN IF NOT EXISTS interest_end_date date,
  ADD COLUMN IF NOT EXISTS interest_paid_through date,
  ADD COLUMN IF NOT EXISTS sol_expiration_date date,
  ADD COLUMN IF NOT EXISTS sol_state text,
  ADD COLUMN IF NOT EXISTS demand_letter_sent_date date,
  ADD COLUMN IF NOT EXISTS validation_notice_sent_date date,
  ADD COLUMN IF NOT EXISTS last_contact_date date,
  ADD COLUMN IF NOT EXISTS last_payment_date date,
  ADD COLUMN IF NOT EXISTS next_action_date date,
  ADD COLUMN IF NOT EXISTS placed_with_agency_date date,
  ADD COLUMN IF NOT EXISTS agency_recall_date date,
  ADD COLUMN IF NOT EXISTS agency_commission_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS agency_reference_number text,
  ADD COLUMN IF NOT EXISTS assignment_doc_reference text,
  ADD COLUMN IF NOT EXISTS closed_date date,
  ADD COLUMN IF NOT EXISTS closure_reason text,
  ADD COLUMN IF NOT EXISTS filing_fees numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fees numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attorney_fees numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_fees numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_offer_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS settlement_accepted boolean,
  ADD COLUMN IF NOT EXISTS settlement_terms text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_creditor text,
  ADD COLUMN IF NOT EXISTS original_account_number text;

-- ============ Update balance function to include new fee fields ============
CREATE OR REPLACE FUNCTION public.collection_matter_balance(_matter_id uuid)
 RETURNS TABLE(principal numeric, court_costs numeric, legal_fees numeric, accrued_interest numeric, payments_total numeric, write_offs_total numeric, balance_due numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m public.collection_matters;
  days int;
  end_date date;
  accrued numeric;
  paid numeric;
  wo numeric;
  total_costs numeric;
  total_fees numeric;
BEGIN
  SELECT * INTO m FROM public.collection_matters WHERE id = _matter_id;
  IF m IS NULL THEN RETURN; END IF;
  end_date := COALESCE(m.interest_end_date, CURRENT_DATE);
  days := GREATEST(0, (end_date - COALESCE(m.interest_paid_through, m.interest_start_date)));
  accrued := ROUND(m.principal * (m.interest_rate/100.0) * days / 365.0, 2);
  total_costs := COALESCE(m.court_costs,0) + COALESCE(m.filing_fees,0) + COALESCE(m.service_fees,0) + COALESCE(m.other_fees,0);
  total_fees := COALESCE(m.legal_fees,0) + COALESCE(m.attorney_fees,0);
  SELECT COALESCE(SUM(amount),0) INTO paid FROM public.collection_payments
    WHERE matter_id=_matter_id AND payment_type IN ('payment','court_cost_recovery');
  SELECT COALESCE(SUM(amount),0) INTO wo FROM public.collection_payments
    WHERE matter_id=_matter_id AND payment_type IN ('write_off','adjustment');
  principal := m.principal;
  court_costs := total_costs;
  legal_fees := total_fees;
  accrued_interest := accrued;
  payments_total := paid;
  write_offs_total := wo;
  balance_due := m.principal + total_costs + total_fees + accrued - paid - wo;
  RETURN NEXT;
END $function$;

-- ============ DOCUMENTS: link to collection matters ============
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS collection_matter_id uuid REFERENCES public.collection_matters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;

ALTER TABLE public.documents ALTER COLUMN case_id DROP NOT NULL;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_case_or_matter_chk;
ALTER TABLE public.documents ADD CONSTRAINT documents_case_or_matter_chk
  CHECK (case_id IS NOT NULL OR collection_matter_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_documents_collection_matter ON public.documents(collection_matter_id);

-- Update client-visible policy to also cover collection-matter documents
DROP POLICY IF EXISTS "Clients view visible documents" ON public.documents;
CREATE POLICY "Clients view visible documents" ON public.documents FOR SELECT TO authenticated
USING (
  visible_to_client = true
  AND COALESCE(is_internal, false) = false
  AND (
    (case_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = documents.case_id AND c.client_id = public.get_user_client_id(auth.uid())
    ))
    OR
    (collection_matter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.collection_matters m WHERE m.id = documents.collection_matter_id AND m.client_id = public.get_user_client_id(auth.uid())
    ))
  )
);

-- Storage: allow clients to view documents in their matter folder (matter/{matter_id}/...)
-- when a matching client-visible, non-internal doc row exists for that matter
CREATE POLICY "Clients view matter documents storage" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'case-documents'
  AND (storage.foldername(name))[1] = 'matter'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.collection_matters m ON m.id = d.collection_matter_id
    WHERE d.file_path = storage.objects.name
      AND d.visible_to_client = true
      AND COALESCE(d.is_internal, false) = false
      AND m.client_id = public.get_user_client_id(auth.uid())
  )
);
