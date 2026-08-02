# Attorney review queue (Phase B, Stage 2)

Route: `/attorney` inside the existing attorney portal shell.

The queue is derived from referrals, tasks, matter status, holds, information requests
and matter change events — never from case status alone (`src/lib/attorney-queue.ts`).

## Groupings

| Group | Membership rule |
|---|---|
| New referrals | referral status `sent` |
| Awaiting acceptance | referral status `pending_acceptance` |
| Needs information | referral status `needs_information`, or an open blocking information request |
| Ready for legal review | referral `accepted` with no blocking item |
| Eligibility to confirm | referral `accepted`, proposed filing date present, not yet confirmed, unblocked |
| Approved for filing | attorney-confirmed filing eligibility recorded |
| Upcoming deadlines | next task or request due within 7 days |
| Recently changed | a hard matter change event in the last 7 days |

## Row content

Client, property, unit, tenant, matter type, current balance, matter status, referral
status, blocking hold or request, next action, assigned attorney, due date, referral
packet version, last material change date.

## Actions

Open matter, acknowledge, accept, decline (reason dialog), review revised packet, and
task completion. Actions render only when the pure guard
`evaluateReferralTransition()` agrees the signed-in principal may perform them; the
RPC re-checks server-side regardless.

## Admin equivalents

`/admin/referrals` groups every referral into draft, sent, pending attorney acceptance,
declined needing reassignment, needs information, and accepted/under review.

## Known limitations

- Queue counts are computed client-side over RLS-scoped rows; there is no server-side
  aggregate view yet, so very large portfolios will want a materialized queue later.
