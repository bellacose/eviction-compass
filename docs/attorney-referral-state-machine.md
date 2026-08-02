# Attorney referral state machine (Phase B, Stage 2)

## Statuses

| Status | Meaning | Active? |
|---|---|---|
| `draft` | Staff prepared the referral; nothing sent | no |
| `sent` | Referral delivered to attorney/firm | yes |
| `pending_acceptance` | Attorney acknowledged receipt, must accept or decline | yes |
| `accepted` | Named attorney owns the legal review | yes |
| `needs_information` | Review paused on a blocking information request | yes |
| `declined` | Attorney declined, with a required reason | no (history) |
| `withdrawn` | Staff withdrew the referral, with a required reason | no (history) |
| `completed` | Attorney review finished | no (history) |

**Active referral** = `sent`, `pending_acceptance`, `accepted`, `needs_information`.
A partial unique index (`attorney_referrals_one_active_per_case`) enforces one active
referral per matter at the database level. Declined, withdrawn and completed referrals
remain queryable forever and do not block a new referral to another attorney.

## Transition matrix

| Key | From → To | Actors | Reason | Notes |
|---|---|---|---|---|
| `send_referral` | draft → sent | admin | – | Requires a referral packet version |
| `acknowledge_referral` | sent → pending_acceptance | admin, attorney | – | Creates blocking `attorney_accept_referral` task |
| `accept_referral` | pending_acceptance → accepted | attorney | – | Named attorney only |
| `decline_referral` | pending_acceptance → declined | attorney | required | Creates `admin_reassign_referral` task; matter stays open |
| `request_information` | accepted → needs_information | attorney, admin | required | – |
| `information_satisfied` | needs_information → accepted | attorney, admin | – | Also fired automatically when the last blocking request resolves |
| `complete_referral` | accepted → completed | attorney, admin | – | – |
| `withdraw_sent_referral` | sent → withdrawn | admin | required | – |
| `withdraw_pending_referral` | pending_acceptance → withdrawn | admin | required | – |
| `withdraw_accepted_referral` | accepted → withdrawn | admin | required | – |
| `withdraw_needs_information_referral` | needs_information → withdrawn | admin | required | – |

Rules are rows in `attorney_referral_transition_rules` — the matrix is data-driven,
not hardcoded in application code.

## Named-attorney rule

`accept_referral` and `decline_referral` set `requires_named_attorney`. The RPC then
requires an active `current_attorney_id()`:

- If `attorney_id` is set, only that attorney may act.
- If the referral was addressed to a firm with no named attorney, any active member of
  that firm may accept or decline, and the acting attorney is stamped onto `attorney_id`.
  Firm visibility alone never lets a colleague act on a referral named to someone else.

Filing approval remains a named-attorney action in Stage 3.

## Packet version rules

- `send_referral` requires `referral_packet_id`; the version is frozen on the referral.
- The packet on an active referral is never silently swapped. `attach_revised_packet()`
  logs `referral_packet_superseded`, records both packet ids, and opens a blocking
  `attorney_review_revised_packet` task.
- Hard/soft change classification (`record_matter_change`) is unchanged from Stage 1:
  hard changes invalidate approval, soft changes flag the packet for review.
- Superseded packets and their documents are retained for audit.

## Concurrency and idempotency

`transition_attorney_referral()` locks the referral row (`FOR UPDATE`), validates the
rule, actor role, assignment, and reason, then writes the status, one
`attorney_referral_transitions` row, one matter timeline event, and the rule's task
changes in the same transaction. A repeated `_idempotency_key` replays the original
result without duplicating transitions, events or tasks.

## Timeline events

`attorney_referral_created`, `attorney_referral_sent`, `attorney_referral_acknowledged`,
`attorney_referral_accepted`, `attorney_referral_declined`,
`attorney_referral_needs_information`, `attorney_referral_information_satisfied`,
`attorney_referral_withdrawn`, `attorney_referral_completed`, `referral_packet_superseded`.

## RLS access matrix

| Actor | attorney_referrals | referral history | information_requests |
|---|---|---|---|
| Admin | read all, act via RPC | read all | read all, act via RPC |
| Attorney | read own or firm-scoped, assignment re-checked per query | read same | read on assigned matters |
| Client | read own matters (client-safe label only) | none | only requests assigned to them |

Direct status writes are impossible: no `INSERT`/`UPDATE`/`DELETE` grants or policies
exist on these tables for `authenticated`. All writes flow through security-definer RPCs.
Revocation is immediate — suspension, deactivation, firm removal, reassignment or
unassignment all change what `attorney_can_access_referral()` returns on the next query,
and no authorization is cached in the browser.

## Known limitations

- Referral notifications are not emailed in this stage; tasks are the system of record.
- Fee arrangement is a free-text internal field, not a structured billing model.
- Stage 3 filing approvals and privileged note levels are intentionally out of scope.
