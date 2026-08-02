# Filing eligibility, approvals and privileged notes (Phase B, Stage 3)

## Records

| Table | Purpose |
|---|---|
| `balance_snapshots` | Immutable ledger balance captured at referral, confirmation and approval |
| `filing_eligibility_confirmations` | Versioned attorney confirmation of the eligible-to-file date, with packet, referral and questionnaire snapshot |
| `filing_approvals` | Versioned approval that the matter is legally ready to file |

Both versioned tables are append-only: a new decision writes a new `version_number`
and supersedes the prior active row. Nothing is edited in place.

## RPCs

- `confirm_filing_eligibility_v2(...)` — requires an assigned attorney (or admin), an
  accepted referral, a current packet version, no blocking information request, no
  active hold, served notice + service record + ledger + tenancy facts, and notes.
- `approve_filing_readiness(...)` — requires an active confirmation and the same
  unblocked state; captures a balance snapshot.
- `withdraw_filing_approval(...)` — approving attorney or an admin, reason required.
- `process_matter_change_event(...)` — hard changes invalidate the active confirmation
  and approval server-side; soft changes flag for review only.

Client-side pure mirrors live in `src/lib/eligibility.ts` (`canConfirmEligibility`,
`canApproveFiling`, `canWithdrawApproval`) and only gate the UI — the database
re-checks everything.

## Note visibility

`case_notes.visibility` is an enum: `admin_internal`, `client_visible`,
`attorney_privileged`, `agency_visible`, `system_generated`.

`attorney_privileged` notes are readable only by assigned attorneys and authorized
admins, are queried through a dedicated panel, and are excluded from client and
attorney general note lists, exports, packets and notification bodies
(`redactForExport` in `src/lib/notes.ts`). The timeline records that a privileged note
was created — never its text.