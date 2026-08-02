# Phase A — Workflow Engine, Holds, and Tasks

Goal: no screen may write `cases.status` again. Every status change goes through one guarded server function that checks who you are, what the matter needs, and whether a hold blocks it — and leaves an append-only trail.

Confirmed before planning: `CaseDetail.tsx:102` writes `cases.status` from a raw dropdown, `StepReview.tsx:82` writes `attorney_review` directly. Those are the only two direct status writes in the codebase. `cases.is_on_hold`/`hold_reason` exist but are unused. There is no tasks table and no `status_transitioned` event.

## What changes for users

- The status dropdown on the admin matter screen is replaced by a short list of **allowed actions** for the matter's current state. Each action asks for a reason before it applies.
- A **Hold** panel: open a hold with a type, owner, review date and reason; the matter shows as held and advancement is blocked until released. Releasing returns it to the status it was held from.
- A **Next Action** panel on the admin dashboard, client dashboard, admin matter detail and client matter detail: current status, stage, active hold, next open task, who owns it, due date, why it's blocked, and available actions (clients see status/stage/hold/next step only — no admin actions).
- Filing eligibility is shown as **Proposed** until an attorney or admin confirms it. Confirmation is a separate recorded act with its own date and notes.

## Database (one migration)

1. `matter_transitions` — id, case_id, from_status, to_status, transition_key, requested_by, performed_by, actor_role, reason, metadata jsonb, created_at. Append-only: grants exclude UPDATE/DELETE and no update/delete policy is created.
2. `matter_holds` — case_id, hold_type (new enum: bankruptcy, military_review, payment_plan, attorney_review, missing_documentation, tenant_dispute, court_stay, compliance_review, administrative), held_from_status, reason, opened_by, owner_user_id, review_date, released_at, released_by, release_reason, created_at.
3. `tasks` — case_id, task_type, title, description, assigned_user_id, assigned_role, due_at, priority, blocking, status, completed_at, completed_by, related_record_type, related_record_id, escalation_level, created_at, updated_at.
4. `matter_transition_rules` — data-driven config: transition_key, from_status, to_status, label, allowed_roles[], requires_reason, prerequisite_keys[], blocking_hold_types[], creates_task_json, completes_task_types[], is_active. Seeded from Bible §4.4 (matrix below). No generic status dropdown anywhere.
5. `cases` gains: `proposed_eligible_to_file_date`, `confirmed_eligible_to_file_date`, `eligibility_confirmed_by`, `eligibility_confirmed_at`, `confirmation_notes`. Existing `notices.eligible_to_file_date` stays as the calculation source and is relabeled "Proposed" in the UI; nothing is deleted.
6. `transition_matter(_case_id, _transition_key, _reason, _metadata)` — SECURITY DEFINER, `SELECT ... FOR UPDATE` on the case row, then: rule lookup → actor role + client-scope check (`is_admin` / `owns_client`) → prerequisite checks → blocking-hold check → status update → insert `matter_transitions` → insert `matter_events` (`status_transitioned`) → complete/create tasks → return updated matter + next actions as jsonb. Raises a descriptive exception on any failure, so nothing partial commits.
7. Companion functions: `open_matter_hold`, `release_matter_hold`, `confirm_filing_eligibility`, `complete_task` — each writes its own timeline event.
8. RLS + GRANTs on all four new tables: admins full access; client users read-only rows scoped through `owns_client(cases.client_id)`; internal-only rows (internal tasks, hold reasons flagged internal) hidden from clients. `service_role` granted throughout.
9. `auto_create_collection_from_judgment()` is left untouched, with a TODO comment block added in the migration and a note in the conformance audit that it must be disabled in Phase D (zero-principal matters, duplicate debtors).

## Transition matrix (seeded)

| Key | From → To | Roles |
|---|---|---|
| submit_for_review | draft → attorney_review | client, admin |
| request_information | attorney_review → intake | admin |
| resubmit_matter | intake → attorney_review | client, admin |
| approve_notice_route | attorney_review → notice_preparation | admin |
| approve_direct_filing | attorney_review → ready_to_file | admin |
| record_notice_service | notice_preparation → notice_served | admin |
| begin_waiting_period | notice_served → waiting_period | admin |
| confirm_filing_eligibility | waiting_period → ready_to_file | admin (requires confirmed eligibility date) |
| record_filing | ready_to_file → filed | admin |
| schedule_appearance | filed → court_scheduled | admin |
| begin_court_process | court_scheduled → in_court_process | admin |
| await_outcome | in_court_process → outcome_pending | admin |
| record_outcome | outcome_pending → resolved | admin |
| close_matter | resolved → closed | admin |
| place_on_hold / release_hold | any active ↔ on_hold (via hold functions) | admin |

`admin` covers `admin` + `super_admin` today; `allowed_roles[]` is text so attorney/agency roles drop in next sprint without a schema change.

## Application code

- `src/lib/transitions.ts` — typed wrapper: `transitionMatter()`, `openHold()`, `releaseHold()`, `confirmEligibility()`, `completeTask()`, plus `availableTransitions(status, role)` reading the rules table, and pure guard helpers (used by tests).
- `src/components/admin/MatterActionsPanel.tsx` — replaces the status `<Select>` in `CaseDetail.tsx` with action buttons + reason dialog.
- `src/components/admin/MatterHoldPanel.tsx` — open/assign/review-date/release.
- `src/components/NextActionPanel.tsx` — shared, with an `audience="admin" | "client"` prop; mounted on admin dashboard, client dashboard, admin matter detail, client matter detail.
- `StepReview.tsx` — submits via `transitionMatter("submit_for_review")` instead of a direct update.
- Filing eligibility UI in `NoticesPanel.tsx` labels dates **Proposed** and adds an admin-only Confirm control.
- Existing `intake_step_1_completed` … `intake_step_10_completed` keys are preserved exactly.

## Events emitted

`status_transitioned`, `matter_hold_opened`, `matter_hold_released`, `task_created`, `task_completed`, `attorney_eligibility_confirmed`, `matter_amendment_requested`, `matter_resubmitted`.

## Tests

Two layers, because the sandbox test runner (vitest/jsdom) has no authenticated database session:

1. **Vitest unit tests** on the extracted guard logic in `src/lib/transitions.ts` against a fixture copy of the seeded rules: client cannot reach `filed`, cross-client rejection, bankruptcy hold blocks advancement, missing prerequisite blocks, invalid transition returns no status change, proposed vs. confirmed eligibility stay distinct, resubmission path after information request.
2. **SQL assertions run against the live database** during the sprint (as `service_role` and as a scoped client), verifying that a valid transition writes exactly one `matter_transitions` row and one `matter_events` row, and that an invalid one leaves status unchanged. Results reported in the completion summary; these are one-off verifications, not part of the vitest suite.

## Out of scope this sprint

Attorney/agency login roles (schema is role-ready but the enum is unchanged), court/judgment records, collections handoff changes, notifications delivery, PII masking.

## Closing report

Migration summary, transition matrix, direct-status-write removals, RLS policies added, tests and results, known limitations, regression risks — plus an update to `docs/matter-bible-conformance-audit.md`.