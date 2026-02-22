
-- Add first_name, last_name, ssn, date_of_birth to tenants
ALTER TABLE public.tenants ADD COLUMN first_name text;
ALTER TABLE public.tenants ADD COLUMN last_name text;
ALTER TABLE public.tenants ADD COLUMN ssn_last4 text;
ALTER TABLE public.tenants ADD COLUMN date_of_birth date;

-- Add military_verified and eviction_reason to cases
ALTER TABLE public.cases ADD COLUMN military_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.cases ADD COLUMN eviction_reason text NOT NULL DEFAULT 'unpaid_rent';
ALTER TABLE public.cases ADD COLUMN eviction_reason_other text;
