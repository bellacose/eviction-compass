# Information request workflow (Phase B, Stage 2)

## States

`open` → `responded` → `under_review` → `resolved`
Any open state may be `withdrawn`. A reviewed response may be reopened back to `open`.

## Categories

`lease`, `ledger`, `notice`, `service`, `tenancy`, `tenant_identity`, `bankruptcy`,
`military_status`, `payment`, `court_document`, `other`.

## RPCs

| RPC | Actor | Effect |
|---|---|---|
| `create_information_request()` | attorney on an assigned matter, or admin | Creates the request and a `client_provide_information` task (blocking by default) |
| `respond_to_information_request()` | assigned user, client on their own matter, or admin | Appends a row to `information_request_responses`, completes the client task, opens `attorney_review_information_response` |
| `review_information_request()` | attorney or admin | `responded` → `under_review` |
| `resolve_information_request()` | attorney or admin | Requires resolution notes; closes tasks; returns a `needs_information` referral to `accepted` when no blocking request remains |
| `withdraw_information_request()` | requester or admin | Requires a reason; cancels the task |

`resolve_information_request(_reopen => true)` reopens the request and issues a fresh
responder task. The original request text and every response row are immutable —
`information_request_responses` rejects UPDATE and DELETE at the trigger level, and
revisions are appended with `is_revision = true`.

## Blocking behavior

`has_blocking_information_request(case_id)` is true while any blocking request is
`open`, `responded` or `under_review`. `confirm_filing_eligibility()` raises when that
is true, so filing approval cannot happen over an unanswered attorney request.
Resolving the last blocking request returns the referral to review — it never approves
filing on its own.

## Timeline events

`information_request_created`, `information_request_responded`,
`information_request_under_review`, `information_request_resolved`,
`information_request_withdrawn`.

## Tasks

`client_provide_information`, `attorney_review_information_response`, plus the referral
task types `attorney_review_referral`, `attorney_accept_referral`,
`admin_reassign_referral`, `attorney_review_revised_packet`. Tasks — not notifications —
are the authoritative work queue.

## Client visibility

Clients see only requests assigned to them (`assigned_user_id = auth.uid()` or
`assigned_role = 'client'`) on their own matters, together with their own response
history. Internal attorney fields (`requested_by_counsel_id`, resolution notes shown to
staff, fee terms, decline detail) are not rendered in the client portal.

## Known limitations

- Document uploads attach through the existing private `case-documents` bucket and are
  referenced by id on the response row; there is no dedicated request-document bucket.
- Reopen currently reuses the original assignee; per-reopen reassignment is not modelled.
