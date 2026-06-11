---
name: Payment Arrangements
description: Payment plans + scheduled payments per case, auto-generated installments, client read-only
type: feature
---
Tables: `payment_plans`, `scheduled_payments`.

- Plan fields: start_date, frequency (weekly/biweekly/monthly), installment_count, installment_amount, total_amount, status.
- DB trigger `generate_payment_plan_installments` auto-creates one `scheduled_payments` row per installment on plan insert.
- Scheduled payment status: scheduled | paid | partial | missed | cancelled.
- Ad-hoc one-off payments allowed: `payment_plan_id` is nullable.
- RLS: admins full access; client users SELECT only where the case's `client_id` matches `get_user_client_id(auth.uid())`.
- Admin UI: Payments tab on CaseDetail via `PaymentPlanPanel`.
- Client UI: read-only card on `ClientCaseDetail`.
- Out of scope: payment collection, auto late fees, reminder emails, global Payments calendar (planned but not built yet).