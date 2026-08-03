# Add a "Resolve" route out of Intake

## Where things stand

This matter (EV-2026-0012) is in **intake**. The workflow engine only allows the routes defined in the transition rules table, and intake currently has exactly two:

- Resubmit matter → attorney_review
- Withdraw matter → closed (reason required)

So today the only way to get to a terminal state from intake is "Withdraw matter", which lands in **closed** — there is no way to reach **resolved** without first pushing the matter all the way through notice/filing. Later stages (notice_served, waiting_period, ready_to_file, filed, court_scheduled, in_court_process) all have a "Resolve early" action; intake and attorney_review do not.

For the Gabby Moore situation (tenant vacated owing a balance, no court process needed), "resolved" is the right end state, with the money tracked as a Collections matter.

## What to add

Two new admin-only transition rules, reason required:

| From | Action | To |
|---|---|---|
| intake | Resolve matter (no court action) | resolved |
| attorney_review | Resolve matter (no court action) | resolved |

The existing `resolved → closed` ("Close matter") rule then finishes the lifecycle, and closed can still be reopened.

Nothing else changes: the Matter Actions panel reads its buttons from the rules table, so both actions appear automatically with the reason dialog, timeline entry and transition audit record.

## How to use it afterwards

On the case page, open **Workflow Tools** → **Available Actions** → "Resolve matter (no court action)" → enter a reason (e.g. "Tenant vacated voluntarily 2026-07; balance moved to collections") → Confirm. Then "Close matter" once the balance is handed to Collections and the final accounting is done.

## Technical notes

- One migration inserting two rows into `public.matter_transition_rules` (`resolve_early_intake`, `resolve_early_attorney_review`), `allowed_roles = {admin}`, `requires_reason = true`, no prerequisites, no blocking hold types, ordered after the existing intake/review actions.
- `attorney_review` rules also complete the `attorney_review` task, so the new review-stage rule should do the same for consistency.
- Update `docs/matter-transition-matrix.md` with the two new rows.
