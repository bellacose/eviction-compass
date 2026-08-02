# Smoke Test Remediation Plan

## What the data shows

I checked the four test matters directly in the database. The findings differ from the report's diagnosis in one important way.

**The ledger bug is not a race condition or a caching problem.** The ledger table has a rule that only allows two line types: `rent` and `late_fee`. Every line the tester typed with a different type — payment, credit, damage, cleaning, deposit — was rejected by the database on save.

Evidence:
- EV-2026-0011: only 3 of 4 lines stored (rent, late fee, rent). The payment line is absent. The $2,250 target never persisted.
- EV-2026-0009: only 1 of 6 lines stored, even though the app reported $980.00.
- EV-2026-0010: 0 of 4 lines stored, even though the audit log says "4 line(s) added — balance $1,900.00".

So Tests 2 and 3 did **not** actually pass. Their "exact match" balances were computed in the browser and written to the matter's balance field, but the underlying ledger lines were never saved. This is broader than the report concluded and affects all four matters.

Two contributing defects:
1. The Type field on a ledger line is a free-text box with no list of valid values, so nothing warns the user before save.
2. The save writes lines one at a time; when line N is rejected, lines 1..N-1 stay saved and the balance summary is still written, leaving a half-saved ledger. The published build additionally recorded a success entry on the timeline. The dev build now stops with an error but still leaves the partial writes.

Also confirmed: EV-2026-0008 has two entries dated in the year **12024** — the date field accepts any year.

## Fixes

### 1. Ledger line types (root cause)
- Widen the allowed line types to a proper set: rent, late fee, legal fee, court cost, damages, cleaning, utilities, NSF fee, other — plus payment and credit for money-in lines.
- Replace the free-text Type box with a dropdown of exactly those values, so an invalid type becomes impossible to enter.

### 2. Make ledger saves all-or-nothing
- Move the ledger save into a single server-side call that deletes, inserts and updates every line in one transaction and returns the recomputed balance.
- The matter's balance and the timeline entry are written by that same call, so the audit log can never claim a balance the stored lines don't support.
- On failure nothing is written and the exact rejected line is named in the error.

### 3. Date sanity
- Reject entry dates outside a sensible window (no year 12024, nothing before the tenancy start, no far-future dates) in both the form and the server call.

### 4. Case-detail audit trail
- The Timeline tab on a case currently shows workflow milestones only, and the Activity tab reads a separate legacy activity table that status changes no longer write to. That is why the tester saw empty tabs.
- Point the case-detail Timeline tab at the same matter-event feed the intake wizard uses, so status transitions, notices, ledger updates, approvals and notes all appear there.

## On the "missing" attorney features

The tester used the published URL, which is behind the current build. Attorney assignment, referrals, information requests, system-proposed vs attorney-confirmed filing dates, filing approvals with balance snapshots, privileged notes and attorney-scoped access all exist in the current code on the case-detail screen. Nothing to build there — the app needs republishing, then that part of the smoke test re-run against the fresh build.

One genuine gap: the Counsel Directory is reachable from the Users menu, but the path from a case to "assign this attorney" runs through the Referral panel rather than a plain attorney picker. Worth a follow-up discoverability pass, not part of this fix.

## Verification
- Re-enter the EV-2026-0009, EV-2026-0010 and EV-2026-0011 ledgers through the UI and confirm every line is present in the database with the fixture balance.
- Confirm a deliberately bad line rolls back the whole save and leaves the previous ledger intact.
- Confirm status changes now show up on the case-detail Timeline.

## Technical notes
- Drop and recreate `ledger_entries_charge_type_check` with the widened value list (or a `ledger_charge_type` enum).
- New `save_ledger(_case_id, _lines jsonb)` security-definer RPC doing the full replace plus `cases.current_balance` update plus `matter_events` insert in one transaction; `StepLedger.tsx` calls it instead of looping inserts.
- Date guard via trigger, not a CHECK, since it is time-dependent.
- `CaseDetail.tsx` Timeline tab renders `MatterTimeline` with `includeInternal`; milestones move to their own tab.