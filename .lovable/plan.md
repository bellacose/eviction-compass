# Matter Bible: Store + Full Conformance Audit

## Goal
Bring the Matter Bible into the project as the governing spec, then audit every part of Evict OS against it and deliver a gap report with a phased roadmap.

## Step 1 — Store the Bible in the project
- Add `docs/Eviction_Compass_Matter_Bible_v1.0.md` (verbatim copy of the upload).
- Add project memory so future work follows it automatically:
  - Core rule: the Matter Bible is the governing spec; conflicts get logged, not silently resolved.
  - `mem://spec/matter-bible` — section map (state machine, actors, NY nonpayment, collections, timeline catalog, security) so the right section is read on demand.
- No app behavior changes in this step.

## Step 2 — Conformance audit (read-only)
Audit each Bible chapter against the live code and database.

| Bible area | Checked against |
|---|---|
| 2. Actors & permissions | `user_roles`, `has_role`/`is_admin`, RLS policies, auth context |
| 3. Matter types & routing | `matter_type` enum, intake Matter Info step, routing branches |
| 4. State machine | `case_status` enum vs. Bible statuses, transition table, holds, `nextRequiredAction()` |
| 5. NY nonpayment | `notices`, `notice_rules`, `calc_notice_deadlines`, service records |
| 6. Holdover / lease violation | intake + notice coverage for non-nonpayment types |
| 7. Attorney workflow | `counsel`, `case_counsel`, attorney auth/queue/privilege |
| 8. Court, judgment, possession | `court_events` vs. required judgment and warrant records |
| 9. Collections | `collection_matters`, handoff/final-accounting path, debtor-to-tenant dedupe |
| 10. Data & documents | `ledger_entries`, balance snapshots, document categories, provenance |
| 11. Timeline event catalog | Bible event keys vs. keys actually emitted in code |
| 12. Tasks, notifications, deadlines | `notifications` vs. required durable tasks and escalation |
| 13. Security, PII, audit | RLS, `activity_log`, sensitive-field masking and reveal logging |
| 16. Acceptance tests | Whether each end-to-end test can be completed in the app today |

For each item: status (Conformant / Partial / Missing / Conflict), evidence (file, table, or function), and the concrete delta required.

## Step 3 — Deliverables
1. `docs/matter-bible-conformance-audit.md` in the repo, kept updated each sprint.
2. The same report written to your Files section for download and sharing.
3. A phased roadmap ordered against Bible section 14.6, each phase mapped to the gaps it closes:
   - Phase A: central state-transition service with transition log; tasks and a Next Action panel.
   - Phase B: attorney authentication, assignment, review queue, privilege/visibility rules.
   - Phase C: balance snapshots on notices; court filing record; structured judgment and warrant.
   - Phase D: final accounting and controlled collection handoff; agency status import; direct-payment reporting.
   - Phase E: audit logging, PII masking with reveal logs, environment separation, acceptance-test regression pass.
4. A short "conflicts" section listing places where the app deliberately differs from the Bible, for your decision rather than a silent code change.

## Scope note
Documentation and analysis only — no schema, route, style, or behavior changes. Implementation starts after you pick a phase.