# Phase B — Stage 3: Eligibility Confirmations, Filing Approvals, Invalidation, Privileged Notes

Builds on the existing Phase A workflow engine and Phase B Stage 1/2 work. Nothing already shipped is redesigned: referrals, packets, information requests, tasks, holds, transitions, change rules and the attorney queue stay as they are and are reused as inputs.

## What this adds

**1. Frozen balance snapshots**
A new `balance_snapshots` record captures charges, payments, credits and total balance for a matter at a moment in time, computed server-side from the ledger — never from numbers sent by the browser. Snapshots are immutable, so later ledger edits cannot rewrite history. Snapshot types cover submission, each notice kind, filing eligibility, filing approval, filing, judgment, final accounting and collection handoff.

**2. Filing eligibility confirmations**
Today the confirmed date is written onto the matter itself. Stage 3 moves it into a versioned `filing_eligibility_confirmations` record that keeps the system-proposed date and the attorney-confirmed date side by side, permanently. Each confirmation is bound to one referral packet version and stores a frozen picture of what the attorney actually reviewed: balance snapshot, lease document, notice list, service records, questionnaire answers and active holds. Re-confirming creates a new version that supersedes the old one; the old one is never edited or deleted. Only one active confirmation per matter/referral.

**3. Filing approvals**
A separate `filing_approvals` record represents the attorney's decision that the matter is ready to file. It requires an active confirmed eligibility record, re-verifies that nothing blocking appeared, takes a fresh approval-time balance snapshot and its own manifests, then advances the matter using the existing transition engine (never a direct status write). Approvals can be withdrawn with a reason by the approving attorney or an authorized admin — withdrawal marks the record, it does not remove it, and the matter returns to attorney review through the transition engine.

**4. Hard vs soft change enforcement, server-side**
A central `process_matter_change_event()` path drives invalidation. A hard change (ledger charge/payment/credit amounts, total balance, notice amount, notice preparation/mailing/service dates, service method, tenant identity, matter type, occupancy status, bankruptcy status, military status, lease version, superseded approved packet) invalidates the active confirmation and the active approval, clears the matter's operative filing authorization, opens an attorney re-review task, emits `filing_eligibility_invalidated` and `filing_approval_invalidated`, and sends the matter back to attorney review — all in the database, all idempotent, with historical records preserved. A soft change (nonfinancial supporting document, client-visible note, internal note, phone or contact correction, typo that touches no legal fact or amount) never invalidates: it raises a nonblocking review flag, emits `matter_soft_change_flagged` and surfaces in the attorney queue.

**5. Privileged notes**
Note visibility expands from internal/client_update to five values: admin_internal, client_visible, attorney_privileged, agency_visible, system_generated. Attorney-privileged notes are readable only by the authoring attorney, other actively assigned attorneys permitted by the assignment/firm scope, and authorized admins. Clients, agency users and unassigned attorneys cannot read them, count them, find them by ID or search, or receive their text in exports, collection packets, activity feeds or notifications. An `attorney_privileged_note_created` timeline event is emitted without the note body.

**6. Attorney portal surface**
The attorney matter view gains a review panel showing: proposed vs confirmed date as separate values, the packet version under review, current confirmation and approval status with version history, invalidation banners with the reason and source change, actions to confirm eligibility, approve filing readiness and withdraw an approval (each gated by the same rules the server enforces), and a privileged-notes composer separated from shared notes. The admin case view gets a read-only mirror of confirmation/approval history; the client view shows only the safe status label.

## Technical detail

### Database
- Enums: `eligibility_confirmation_status` (draft, confirmed, invalidated, superseded, withdrawn), `filing_approval_status` (draft, approved, invalidated, withdrawn, superseded), `balance_snapshot_type`, `note_visibility`.
- Tables `balance_snapshots`, `filing_eligibility_confirmations`, `filing_approvals` with exactly the fields listed in the request — each with GRANTs to authenticated/service_role, RLS enabled, and policies: admins full read, assigned attorneys read via `attorney_can_access_case()`, clients restricted to safe status/date fields or no access where the Bible requires. No direct client INSERT/UPDATE/DELETE — writes only through security-definer RPCs. `forbid_mutation()` triggers block UPDATE/DELETE on snapshots and on superseded/invalidated history rows.
- `case_notes.visibility` column added with the new enum, backfilled from `note_type` (internal → admin_internal, client_update → client_visible); `note_type` retained for compatibility. RLS rewritten so attorney-privileged rows are visible only to the author, assigned attorneys under scope, and admins.

### RPCs (all SECURITY DEFINER, `set search_path = public`, row-locked, idempotency-key replay-safe)
- `create_balance_snapshot(_case_id, _snapshot_type, _metadata)` — sums authoritative `ledger_entries`, consistent with `ledger_balance_as_of()`, returns the stored row.
- `confirm_filing_eligibility_v2(...)` — the checks in the request, in order: lock case and referral, active attorney principal, assignment access, referral accepted/active, packet is the packet under review, no unresolved blocking information request (`has_blocking_information_request`), no blocking hold, required notice/service/lease/ledger/tenancy facts present, balance snapshot, document/notice/service/questionnaire/hold manifests, separate proposed and confirmed dates, mandatory notes, supersede prior active confirmation, emit `attorney_eligibility_confirmed`, create/complete the related task, return the record plus next actions. The existing `confirm_filing_eligibility()` is kept as a thin wrapper that delegates, so current callers keep working.
- `approve_filing_readiness(...)` and `withdraw_filing_approval(...)` — as specified, both routing any status change through `transition_matter()` only, emitting `filing_approval_granted` / `filing_approval_withdrawn`.
- `process_matter_change_event(...)` — invoked from the existing `record_matter_change()` so every current caller gets enforcement automatically; classifies via `matter_change_rules` and applies the hard/soft branches above, idempotent per change event.
- `matter_change_rules` seeded/updated so every hard and soft key listed in the request exists with the correct class.

### Client code
- `src/lib/eligibility.ts` — typed RPC wrappers plus pure guards (`canConfirmEligibility`, `canApproveFiling`, `canWithdrawApproval`, `isConfirmationActive`, `classifyInvalidation`) shared by UI and tests.
- `src/lib/notes.ts` — visibility constants, label/tone helpers, and a `visibleNoteFilter(viewer)` used by every portal query, export and packet builder.
- `MatterEligibilityPanel.tsx` reworked to read confirmations rather than case columns; new `FilingApprovalPanel.tsx` and `PrivilegedNotesPanel.tsx`; wired into attorney, admin and client matter views per role. Attorney queue gains "Approved for filing" and "Invalidated — re-review" groupings fed by the new tables.

### Tests
- `src/test/eligibility.test.ts` — confirmation guards, proposed-vs-confirmed separation, supersession chain, packet binding, blocking-request and hold refusal.
- `src/test/approvals.test.ts` — approval preconditions, withdrawal authorization, transition routing.
- `src/test/invalidation.test.ts` — every hard key invalidates, every soft key does not, idempotent replay, history preserved.
- `src/test/notes-visibility.test.ts` — the privileged matrix across client, agency user, unassigned attorney, assigned attorney, author, admin, plus export/packet/notification exclusion.
- Existing Phase A and Phase B suites re-run unchanged as the regression gate.
- A live smoke pass with real rows verifies RLS: a client and an unassigned attorney cannot select privileged notes or approval rows.

### Docs
New `docs/attorney-filing-approval-workflow.md`; updates to the conformance audit, transition matrix and review-queue docs.

## Note
Your message ended mid-section F (attorney portal UI). I have planned the portal surface as described above — tell me if you had specific screens or fields in mind and I will fold them in.