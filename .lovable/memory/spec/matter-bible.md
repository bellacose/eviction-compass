---
name: Matter Bible (governing spec)
description: Section map of docs/Eviction_Compass_Matter_Bible_v1.0.md plus the conformance audit; read before any workflow, notice, court, collections, or permissions work
type: feature
---
`docs/Eviction_Compass_Matter_Bible_v1.0.md` is the governing product/workflow spec (v1.0, Aug 2026). Read the relevant section before building; when code must differ, log it under "Conflicts to decide" in `docs/matter-bible-conformance-audit.md` instead of diverging silently.

Section map:
- 1 Core model, product boundary (delinquent residential tenancy only, not property management)
- 2 Actors and permissions — 8 roles, authority matrix, locking, sensitive-data access, attorney/agency isolation
- 3 Matter types and routing — routing questions, routing rules, conversion rules
- 4 State machine — 14 statuses, stage grouping, transition table, safeguards, hold types
- 5 NY nonpayment workflow; 6 Holdover / lease violation
- 7 Attorney workflow — referral packet, review outcomes, privilege, amendments
- 8 Court, judgment, possession — judgment/warrant records, final accounting
- 9 Collections — placement packet, agency statuses, direct payments, reconciliation
- 10 Data and document rules — ledger model, balance snapshots, provenance, dedupe
- 11 Timeline event catalog (~70 event keys)
- 12 Tasks, notifications, deadlines — tasks are durable, deadlines carry a certainty class
- 13 Security, PII, audit — masking, reveal logging, retention
- 14 Code mapping and implementation order; 15 Pilot ops; 16 Acceptance tests; 17 Open decisions; 18 Change control

Current conformance status and the phased roadmap (A–E) live in `docs/matter-bible-conformance-audit.md`. Update that file at the end of every sprint.

Hard rules already established by the Bible:
- No UI component may write `cases.status` directly — all changes go through a transition service (§4.5).
- Notifications are never the only record of required work (§12.1).
- Collection handoff uses an approved final balance, never a stale or zero amount (§8.6, §9.2).
- Tenant and debtor records must stay linked, never duplicated (§10.7).