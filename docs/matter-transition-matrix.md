# Matter Transition Matrix

Generated from `public.matter_transition_rules` (active rules only) — 2026-08-02.
`transition_matter()` is the only path that may change `cases.status`; a `BEFORE UPDATE`
trigger on `cases` rejects every other status write.

Every non-terminal status has at least one intentional outbound route.

| From | Action (key) | To | Roles | Reason | Prerequisites | Blocking holds | Completes task | Creates task |
|---|---|---|---|---|---|---|---|---|
| draft | Submit for attorney review (`submit_for_review`) | attorney_review | client, admin | no | intake_complete | — | complete_intake | attorney_review |
| draft | Withdraw matter (`withdraw_matter_draft`) | closed | client, admin | yes | — | — | — | — |
| intake | Resubmit matter (`resubmit_matter`) | attorney_review | client, admin | no | — | bankruptcy, compliance_review | supply_information | attorney_review |
| intake | Resolve matter (no court action) (`resolve_early_intake`) | resolved | admin | yes | — | — | supply_information | — |
| intake | Withdraw matter (`withdraw_matter_intake`) | closed | client, admin | yes | — | — | — | — |
| attorney_review | Approve notice route (`approve_notice_route`) | notice_preparation | admin | no | — | bankruptcy, military_review, compliance_review, tenant_dispute | attorney_review | prepare_notice |
| attorney_review | Approve direct filing (`approve_direct_filing`) | ready_to_file | admin | yes | — | bankruptcy, military_review, compliance_review | attorney_review | — |
| attorney_review | Request more information (`request_information`) | intake | admin | yes | — | — | attorney_review | supply_information |
| attorney_review | Resolve matter (no court action) (`resolve_early_attorney_review`) | resolved | admin | yes | — | — | attorney_review | — |
| attorney_review | Withdraw matter (`withdraw_matter_review`) | closed | client, admin | yes | — | — | attorney_review | — |
| notice_preparation | Record notice service (`record_notice_service`) | notice_served | admin | no | notice_served_recorded | bankruptcy, compliance_review | prepare_notice | — |
| notice_preparation | Cancel matter (`cancel_matter_notice_prep`) | closed | admin | yes | — | — | — | — |
| notice_served | Begin statutory waiting period (`begin_waiting_period`) | waiting_period | admin | no | — | bankruptcy | — | — |
| notice_served | Resolve early (`resolve_early_notice_served`) | resolved | admin | yes | — | — | — | — |
| notice_served | Cancel matter (`cancel_matter_notice_served`) | closed | admin | yes | — | — | — | — |
| waiting_period | Advance to ready to file (`confirm_eligibility_ready`) | ready_to_file | admin | no | eligibility_confirmed | bankruptcy, military_review, payment_plan, compliance_review, court_stay | — | file_petition |
| waiting_period | Resolve early (`resolve_early_waiting`) | resolved | admin | yes | — | — | — | — |
| waiting_period | Cancel matter (`cancel_matter_waiting`) | closed | admin | yes | — | — | — | — |
| ready_to_file | Record court filing (`record_filing`) | filed | admin | no | — | bankruptcy, military_review, payment_plan, compliance_review, court_stay | file_petition | — |
| ready_to_file | Resolve early (`resolve_early_ready`) | resolved | admin | yes | — | — | — | — |
| ready_to_file | Cancel matter (`cancel_matter_ready`) | closed | admin | yes | — | — | — | — |
| filed | Schedule court appearance (`schedule_appearance`) | court_scheduled | admin | no | — | bankruptcy, court_stay | — | — |
| filed | Resolve early (`resolve_early_filed`) | resolved | admin | yes | — | — | — | — |
| court_scheduled | Begin court process (`begin_court_process`) | in_court_process | admin | no | — | bankruptcy, court_stay | — | — |
| court_scheduled | Resolve early (`resolve_early_scheduled`) | resolved | admin | yes | — | — | — | — |
| in_court_process | Await outcome (`await_outcome`) | outcome_pending | admin | no | — | — | — | — |
| in_court_process | Resolve early (`resolve_early_in_court`) | resolved | admin | yes | — | — | — | — |
| outcome_pending | Record outcome (`record_outcome`) | resolved | admin | yes | — | — | — | final_accounting |
| resolved | Close matter (`close_matter`) | closed | admin | yes | — | — | final_accounting | — |
| closed | Reopen matter (`reopen_matter`) | intake | admin | yes | — | — | — | — |
| on_hold (legacy) | Return to intake (`return_legacy_hold`) | intake | admin | yes | — | — | — | — |

## Terminal designation

- `closed` is the terminal state. It is reachable from every earlier status via withdraw, cancel or close, and is recoverable only through the explicit `reopen_matter` action.
- The legacy `on_hold` status value is not used by new work — suspension is represented by rows in `matter_holds`. The single `return_legacy_hold` rule exists so no historical matter can get stranded.
- The Next Action panel now renders "Terminal status — no further action" rather than silently showing nothing.

## Holds

Holds do not change status. They are recorded in `matter_holds` and evaluated by
`transition_matter()` against each rule's `blocking_hold_types`. Releasing the last active
hold clears `cases.is_on_hold`.

## Attorney referral transitions (Phase B, Stage 2)

Matter status and referral status are separate state machines. Referrals never change
`cases.status`; they drive tasks, timeline events and the attorney queue.
See `docs/attorney-referral-state-machine.md` for the full matrix, the one-active-referral
rule, the named-attorney rule and packet version immutability.

| From → To | Key | Actors | Reason |
|---|---|---|---|
| draft → sent | `send_referral` | admin | – (packet required) |
| sent → pending_acceptance | `acknowledge_referral` | admin, attorney | – |
| pending_acceptance → accepted | `accept_referral` | named attorney | – |
| pending_acceptance → declined | `decline_referral` | named attorney | required |
| accepted → needs_information | `request_information` | attorney, admin | required |
| needs_information → accepted | `information_satisfied` | attorney, admin | – |
| accepted → completed | `complete_referral` | attorney, admin | – |
| sent / pending_acceptance / accepted / needs_information → withdrawn | `withdraw_*_referral` | admin | required |
