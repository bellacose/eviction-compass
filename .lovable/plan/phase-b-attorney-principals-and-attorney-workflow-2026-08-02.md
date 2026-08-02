# Phase B — Attorney Principals and Attorney Workflow

Attorneys become real authenticated users with their own scoped access, referral lifecycle, review queue, and privileged notes. Security model first, screens after.

Delivered in three approvals so the security foundation can be tested before UI work:

- Stage 1: B1 + B2 (identity, assignment, isolation) — build now
- Stage 2: B3 + B4 + B5 (referrals, queue, information requests)
- Stage 3: B6 + B7 + B8 + B9 (eligibility, approval snapshots, privileged notes, tests)

## Stage 1 — Attorney identity and assignment-scoped access

### B1. Attorney principal model

Today `counsel` is a contact directory with no login. It becomes a principal record:

- New `attorney` value on the role enum.
- New `firms` table: name, address, contact, jurisdictions, active flag.
- `counsel` gains: linked auth user, primary firm, status (`invited`, `active`, `inactive`, `suspended`), firm-administrator flag, bar jurisdictions, invitation sent/accepted timestamps.
- New `firm_members` table so an attorney can belong to more than one firm, with a per-firm role (member or firm admin).
- Attorney invitation reuses the existing invite-user function: creates the auth user, grants the attorney role, links it to the counsel record, and flips status to active on first sign-in.
- Admin UI: the Counsel Directory gains firm, status, and "Invite to portal" controls, plus a Firms tab.

Rule enforced throughout: an attorney's access comes from their authenticated identity plus assignment, never from being named on a contact record.

### B2. Assignment-scoped access rules

New security helpers (security definer, mirroring the existing admin/client helpers):

- `current_attorney_id()` — the counsel row for the signed-in user, only when status is active.
- `attorney_can_access_case(case_id)` — true when the case is assigned to that attorney directly, or assigned to their firm and the assignment allows firm-level access.
- `is_firm_admin(firm_id)`.

`case_counsel` gains a firm reference and an "allow firm access" flag so an assignment is either attorney-specific or firm-wide.

Access rules added for the attorney role:

| Data | Attorney access |
|---|---|
| cases | read assigned matters only; no status writes outside the transition engine |
| documents | read non-internal documents on assigned matters, plus attorney-review documents |
| case_notes | read/write on assigned matters; privileged notes attorney-only (Stage 3) |
| tasks | read/update tasks assigned to them or their firm on assigned matters |
| notices, ledger, service records, tenancies, properties | read-only on assigned matters |
| clients, collections, users, settings | no access |

Attorneys get no admin visibility anywhere. Reassignment or deactivation takes effect immediately because access is evaluated per query, not cached.

Storage: document downloads are re-checked against the same helper, so a direct file URL is useless without an active assignment.

Routing: a new `/attorney` area with its own layout; `isAttorney` is added to the auth context and drives the default landing route.

### Stage 1 tests

Automated tests run as real attorney sessions against the database:

- Attorney A cannot read Attorney B's matter
- Attorney cannot read an unassigned matter by ID
- Firm-level assignment grants firm members access; a different firm gets nothing
- Firm admin sees only their own firm's matters
- Reassignment immediately removes the previous attorney's access
- Suspended or inactive attorney loses all access
- Direct document path access is denied without assignment
- Attorney cannot write case status directly or call an admin-only transition

## Stage 2 — Referral lifecycle, queue, information requests (summary)

- `attorney_referrals` table with its own state (`draft`, `sent`, `pending_acceptance`, `accepted`, `declined`, `needs_information`, `withdrawn`, `completed`), kept separate from case status: matter, attorney, firm, sent by/at, decided by/at, decline reason, packet version, fee arrangement, internal notes, client-visible status label.
- Referral state changes go through an RPC in the Phase A style (idempotency key, timeline event, task creation) — never a direct table write from the UI.
- Attorney review queue dashboard grouped into: new referrals, awaiting acceptance, needs information, ready for legal review, eligibility to confirm, approved for filing, upcoming deadlines, recently changed. Each row shows client, property/unit, tenant, matter type, balance, status, blocking item, next action, due date.
- `information_requests` table (category, description, related document or ledger entry, assignee, due date, blocking flag, status, response, resolution) that creates a blocking task via the existing task engine; the matter returns to review only when the request is resolved.

## Stage 3 — Eligibility, approval snapshots, privileged notes, regression (summary)

- Eligibility confirmation extended to record the reviewed balance snapshot, document versions, and service records alongside the existing proposed/confirmed dates; both dates always shown distinctly in the UI.
- `filing_approvals` table capturing attorney identity, timestamp, matter status, ledger snapshot, notice versions, service records, lease version, questionnaire version, and notes. A database trigger invalidates the approval and opens a new attorney-review task when ledger balance, notice amount or date, service method or date, tenant identity, occupancy status, or bankruptcy/military status changes.
- Note visibility levels (`admin_internal`, `client_visible`, `attorney_privileged`, `agency_visible`, `system_generated`), with privileged notes excluded from the client portal, client exports, collection packets, and agency views.
- Full attorney smoke suite: assignment isolation, firm assignment, reassignment, deactivation, decline with reason, missing-document request, resubmission, confirmed filing date, approval invalidation, privileged note isolation.

## Technical notes

- All new tables follow the project convention: create, grant to the roles the policies allow, enable row level security, then policies. No table is reachable without explicit grants.
- Role checks always go through security-definer helpers to avoid recursive policy evaluation.
- No UI component writes case status; referral and approval actions call RPCs that log timeline events, matching the Phase A transition engine.
- `docs/matter-bible-conformance-audit.md` and `docs/matter-transition-matrix.md` are updated at the end of each stage.