---
name: Notices & Deadline Math
description: Statutory notices (5-day late, 14-day demand), ledger-derived amounts, and jurisdiction-driven cure-by / eligible-to-file dates
type: feature
---
Notices live in `notices`, one per matter, with type, status, amount demanded, ledger-computed amount + override flag, period through, service date/method, and generated document link.

Deadline math is data-driven via `notice_rules` (state / county / notice type → cure days, business-day counting, mailing days per service method, extra days before filing). County `*` = statewide fallback. Rules are editable in Admin Settings → Notice Rules; never hardcode jurisdiction values in components.

`cure_by_date` and `eligible_to_file_date` are computed by the `calc_notice_deadlines` trigger — always read them from the database, never recompute in the client.

Amount demanded defaults to `ledger_balance_as_of(case_id, date)` (charges − payments − credits). An override stores the computed figure alongside it.

Notice text renders from templates in `system_settings.notice_templates` (built-in fallback in `src/lib/notices.ts`), output as HTML into the private `case-documents` bucket as a `notice` category document.

Access: admins manage; clients read notices on their own matters and may create/edit only while the matter is their own draft.
