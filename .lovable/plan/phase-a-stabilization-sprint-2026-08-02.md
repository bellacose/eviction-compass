# Phase A Stabilization Sprint

Not a feature sprint. One pass to close the acceptance gate: make the database the only way status changes, cover every status with an intentional outcome, and prove atomicity, idempotency and concurrency behaviour.

## Verified current state (queried before planning)

- 14 active transition rules are seeded. Every non-terminal status has at least one outbound rule **except**: no cancel/withdraw route from any status, no route out of the `on_hold` status value, no early-resolution route (e.g. tenant pays, case dismissed) from `filed`, `court_scheduled`, `notice_preparation`, `waiting_period`.
- **Status can be changed outside `transition_matter()` today.** The `cases` policies are `Admins full access cases` (ALL, `is_admin`) and `Clients edit own draft matters` (UPDATE, draft → check allows `draft` or `attorney_review`). Any admin, or any client with a draft, can `PATCH /cases` and set `status` directly from the browser. This fails acceptance criterion 1.
- `transition_matter()` does take `SELECT ... FOR UPDATE` on the case row and `open_matter_hold()` does too, so competing actions serialize; there is no idempotency key, so a retried valid transition after a status change simply fails with "not allowed from status" (safe), but a double-click racing itself can create two identical follow-up tasks.
- Live data spans draft, intake, attorney_review, notice_served, ready_to_file, filed, court_scheduled, resolved — enough to smoke-test through the UI.

## 1. Lock down direct status writes (the real gap)

- Add a `BEFORE UPDATE` trigger on `cases` that rejects any change to `status` unless a session flag set inside `transition_matter()` (and the hold functions) is present. This makes the guard independent of RLS and of who is calling.
- Narrow the client UPDATE policy's check so `status` cannot move to `attorney_review` by direct write; submission goes through the RPC only.
- Keep admin RLS as-is for all other columns; the trigger is what enforces the status rule.

## 2. Full outbound-rule coverage

- Produce `docs/matter-transition-matrix.md`: every `case_status` × outbound transitions, allowed roles, reason requirement, prerequisites, blocking holds, tasks created/completed, and an explicit **TERMINAL** designation for `closed`.
- Seed the missing intentional outcomes:
  - `withdraw_matter` (client + admin, reason required) from `draft`, `intake`, `attorney_review` → `closed`.
  - `cancel_matter` (admin, reason required) from `notice_preparation`, `notice_served`, `waiting_period`, `ready_to_file` → `closed`.
  - `resolve_early` (admin, reason required) from `notice_served`, `waiting_period`, `ready_to_file`, `filed`, `court_scheduled`, `in_court_process` → `resolved` (tenant paid, settled, vacated).
  - `reopen_matter` (admin, reason required) from `closed` → `intake`, so `closed` is terminal-by-default but recoverable.
  - Legacy `on_hold` status: an explicit rule back to `intake` plus a note that holds are represented by `matter_holds`, not by this status.
- `NextActionPanel` gets an explicit "Terminal — no further action" state so a missing action is never ambiguous.

## 3. Atomicity

- Audit `transition_matter()` for anything that could commit partially. It is a single `plpgsql` function, so status update + `matter_transitions` + `matter_events` + task writes already share one transaction and any raised exception rolls all of it back — the sprint verifies this with a deliberate failure (a task insert that violates a constraint) and confirms the status did not move.

## 4. Idempotency

- Add `matter_transitions.idempotency_key text` with a unique index scoped to `case_id`, and an optional `_idempotency_key` argument on `transition_matter()`. When the key already exists for the case, return the prior result instead of performing the work again.
- The UI passes a key generated once per dialog open, so a double-click or retry cannot create two transitions, two timeline events, or duplicate tasks. Same treatment for `open_matter_hold` (already guarded by the "active hold of this type exists" check) and `complete_task` (already a no-op when completed).
- Disable action buttons while a request is in flight — belt as well as braces.

## 5. Verification (server-side, not just vitest)

Run these directly against the database as a scoped client role and as admin, and report results in the closing summary:

- Direct `UPDATE cases SET status` as admin and as client — must be rejected by the trigger.
- Client invoking an admin-only transition — must raise "Role client may not perform …".
- Transition on a matter with an active bankruptcy hold — must raise "Blocked by an active bankruptcy hold".
- Same RPC called twice with the same idempotency key — one transition row, one timeline event, one task.
- Two competing calls (advance vs. open bankruptcy hold) — one wins, the other returns a clear blocked/stale-state error, state stays consistent.

## 6. UI smoke fixtures

Drive the real screens with Playwright and capture screenshots for each journey:

1. Current tenant with a payment plan — payment_plan hold blocks `confirm_eligibility_ready`.
2. Bankruptcy hold — blocks advancement everywhere it is listed, releases cleanly.
3. Attorney approval, admin acting as attorney — `attorney_review` → `notice_preparation` and → `ready_to_file`.
4. Former tenant collection routing — resolve/close then collections handoff.
5. Invalid attempts — client sees no admin actions; a stale page's action fails with a readable message.

## Deliverables

- One migration: status-write trigger, tightened client policy, new seeded rules, idempotency column + function signature.
- `docs/matter-transition-matrix.md` (the coverage report).
- Updated `src/lib/transitions.ts` (idempotency key, terminal-state helper) and `MatterActionsPanel` / `NextActionPanel`.
- New vitest cases for terminal states and idempotency-key handling.
- Closing report: acceptance-gate checklist with pass/fail evidence, plus an update to `docs/matter-bible-conformance-audit.md`.

## Out of scope

Attorney and agency login principals (Phase B / D), notifications delivery, court and judgment records.
