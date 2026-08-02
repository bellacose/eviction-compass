# Matter Bible Conformance Audit

**Spec:** `docs/Eviction_Compass_Matter_Bible_v1.0.md` (v1.0, Aug 1 2026)
**Audited:** Aug 2 2026 — read-only review of code + live database schema/functions
**Legend:** Conformant / Partial / Missing / Conflict

## Scorecard

| # | Bible area | Status | Headline gap |
|---|---|---|---|
| 2 | Actors & permissions | Partial | Only 3 roles exist; no attorney or agency principals |
| 3 | Matter types & routing | Partial | Types exist; routing rules not enforced |
| 4 | State machine | Missing | No transition service; UI writes status directly |
| 5 | NY nonpayment | Partial | Notices + deadline math shipped; attorney confirmation absent |
| 6 | Holdover / lease violation | Partial | Types selectable; no notice matrix |
| 7 | Attorney workflow | Missing | Counsel is a directory, not a user role |
| 8 | Court, judgment, possession | Partial | Only `court_events`; no judgment/warrant records |
| 9 | Collections | Partial | Module rich; handoff and dedupe unsafe |
| 10 | Data & documents | Partial | Ledger good; no balance snapshots |
| 11 | Timeline event catalog | Partial | 7 of ~70 catalog events emitted |
| 12 | Tasks, notifications, deadlines | Missing | No task entity, no certainty classification |
| 13 | Security, PII, audit | Partial | RLS solid; no masking or reveal logging |
| 16 | Acceptance tests | 0 of 7 fully passing | See per-test table |

## Findings

### 2. Actors and permissions — Partial
- Evidence: `app_role` enum = `super_admin, admin, client`; `src/lib/auth.tsx` derives only `isAdmin`, `isSuperAdmin`, `isClient`.
- Bible requires eight roles including Attorney, Collection Agency Admin, Agency Case User, Auditor, and a Landlord Owner vs. Landlord Staff split.
- Delta: extend `app_role`, add assignment scoping (attorney→`case_counsel`, agency→`collection_matters.agency_id`), and an authority matrix enforced in RLS.

### 3. Matter types and routing — Partial
- Evidence: `matter_type` enum matches the Bible exactly. `cases.lq_*` columns already capture the eight routing questions.
- Missing: routing rules are not applied — answering "former tenant" does not suppress the eviction route, and "unclear facts" does not force `other` + hold/triage. §3.5 conversion rules are unimplemented.

### 4. State machine — Missing (highest-risk gap)
- Evidence: `case_status` enum matches the Bible's 14 statuses. But `src/pages/admin/CaseDetail.tsx:102` does `cases.update({ status })` straight from a dropdown; `StepReview.tsx:83` writes `attorney_review` directly.
- No transition table, no prerequisite checks, no actor authorization, no `status_transitioned` event, no reason capture.
- Holds: `cases.is_on_hold` / `hold_reason` exist but are unused in the UI and there is no `held_from_status`, hold type, owner, or review date.
- Delta: a single `transition_matter()` service (Postgres function + typed client wrapper) plus a `matter_transitions` log, and a `matter_holds` record.

### 5. NY nonpayment workflow — Partial
- Conformant: `notices`, data-driven `notice_rules`, `calc_notice_deadlines()` with mailing-day add-ons and business-day counting, `ledger_balance_as_of()`, service records linked via `service_records.notice_id`.
- Gap: §4/§5 require the calculated date to be **system-proposed** until an attorney confirms. Today `eligible_to_file_date` is treated as authoritative — there is no `eligibility_confirmed_by/at`, and no distinction between proposed and confirmed filing dates (Acceptance Test 1, step 12).
- Gap: the amount on a notice is computed live rather than snapshotted at preparation time.

### 6. Holdover and lease violation — Partial
- `notice_kind` includes `notice_to_quit`/`other`, but `notice_rules` is seeded only for nonpayment kinds and there is no termination-sequence matrix. Holdover matters currently fall through the nonpayment UI.

### 7. Attorney workflow — Missing
- `counsel` and `case_counsel` store contact and fee data only; counsel cannot log in. No referral packet, no accept/decline, no information-request loop, no attorney review queue, no privilege-scoped notes (only `note_type = internal | client_update`).
- §2.5 isolation ("Attorney A cannot see unassigned matters") cannot be tested — there is no attorney principal.

### 8. Court, judgment, possession — Partial
- `court_events` covers hearing/adjournment/judgment/warrant as enum values with a free-text `outcome`. The Bible requires structured judgment (amounts, type, entry date, index) and warrant/possession records.
- Conflict risk: `auto_create_collection_from_judgment()` fires on a milestone and inserts a collection matter with `principal = 0` and a **new debtor row** — this is the exact anti-pattern named in Bible §14.5 (zero-principal handoff, tenant/debtor duplication). It also bypasses final accounting.

### 9. Collections — Partial
- Strong: `collection_matters`, `collection_payments`, `enforcement_actions`, `collection_matter_balance()` with interest, costs, write-offs.
- Gaps: no agency user access (agency rows are admin-managed), no normalized-plus-raw agency status, no placement accept/reject, no direct-payment reporting task, no commission/net reconciliation view. `debtors.tenant_id` exists but dedupe is not enforced by the auto-create trigger.

### 10. Data and documents — Partial
- Ledger model (`ledger_entries` with charge/payment/credit and validation) matches §10.2.
- Missing: balance snapshots (§10.3) — nothing freezes the balance at submission, notice, filing, judgment, or handoff. `document_category` matches §10.4. Rental-application provenance is implemented (`VerifiedFieldInput`, jsonb `{value, source, verified, verification_date}`).

### 11. Timeline event catalog — Partial
- Emitted today: `matter_created`, `intake_step_N_completed`, `ledger_updated`, `document_uploaded`, `document_removed`, `matter_submitted`, `notice_created`, `notice_served`.
- Missing from the catalog: `property_linked`, `unit_linked`, `tenant_linked`, `tenancy_created`, `matter_amendment_requested`, all attorney events, all court events, all collection events, and all control events including `status_transitioned` and `sensitive_data_revealed`.
- Conflict: the Bible names `intake_step_completed`; the code uses per-step keys `intake_step_1_completed`…`intake_step_10_completed` for idempotency. Recommend keeping the code behavior and amending the Bible.
- Append-only is honored by convention, not by policy — `matter_events` has no update/delete restriction beyond RLS review.

### 12. Tasks, notifications, deadlines — Missing
- `notifications` exists (in_app/email, queued/sent/failed/read) but is not wired to delivery, and it is being used as the only record of work — explicitly prohibited by §12.1.
- No tasks table, no owner/escalation/blocking, none of the 18 required task categories, and no deadline certainty classification displayed anywhere in the UI.

### 13. Security, PII, audit — Partial
- Strong: RLS on every table, `has_role`/`is_admin`/`owns_client`/`get_user_client_id` security-definer helpers, draft-only client edits via `is_draft_matter_owner`, private `case-documents` bucket with `visible_to_client` enforcement.
- Missing: sensitive fields (SSN last 4, DOB, DL, banking, employment) render in plain text for any admin; no field-level permission, no masking, no reveal/download/export logging. `activity_log` exists but is written from only one screen.
- Missing: no staging environment separation, no file malware scanning.

### 16. Acceptance tests

| Test | Result | Blocker |
|---|---|---|
| 1 Current-tenant nonpayment | Partial | Steps 1–7, 10–11, 13 mostly work; 8–9 (attorney info request/amendment) and 12 (proposed vs. confirmed date) fail |
| 2 Former-tenant collection | Fail | Eviction route is still the default; no agency accept/status/direct-payment loop |
| 3 Existing judgment | Fail | No structured judgment record; placement can use a stale or zero balance |
| 4 Payment during eviction | Partial | Ledger + timeline work; no urgent attorney task |
| 5 Bankruptcy hold | Fail | Hold columns unused; nothing blocks downstream actions |
| 6 Security isolation | Partial | Client isolation holds; attorney/agency isolation and masking/reveal logging absent |
| 7 Regression | Not run | No workflow-engine change yet; add a regression suite before Phase A ships |

## Conflicts to decide (do not change silently)

1. **Event key granularity** — code emits `intake_step_N_completed`; Bible §11.2 lists `intake_step_completed`. Recommend amending the Bible.
2. **Auto-created collections** — the judgment-milestone trigger contradicts §8.6/§9.2 (approved final accounting gates handoff). Recommend disabling the trigger in Phase D.
3. **Product name** — the Bible is titled "Eviction Compass"; the app ships as "Evict OS". Open Decision §17.
4. **Collections as a stage** — Bible §4.2 keeps collections out of `case_status`; current code agrees. No action.

## Phased roadmap

**Phase A — Workflow engine (largest risk reduction)**
`transition_matter()` Postgres function with the §4.4 transition table, prerequisite and actor checks; `matter_transitions` log; `status_transitioned` event; structured holds with `held_from_status` and hold types; a `tasks` table with owners/due dates/escalation and a Next Action panel on case detail and dashboard.

**Phase B — Attorney portal**
Add `attorney` to `app_role`; link counsel to auth users; assignment-scoped RLS; review queue; accept/decline; information-request loop; privileged notes; attorney-confirmed legal eligibility (`eligibility_confirmed_by/at`) with proposed-vs-confirmed dates surfaced in the UI.

**Phase C — Court, judgment, possession**
`court_filings`, `judgments`, `warrants` tables; balance snapshots at submission/notice/filing/judgment; the §11.4 court event catalog.

**Phase D — Money out the back door**
Final accounting screen; replace the auto-create trigger with an approved handoff that carries the final balance and reuses the existing tenant/debtor link; agency accept/reject, normalized+raw status, direct-payment reporting, commission/net reconciliation.

**Phase E — Assurance**
Field-level masking with reveal/download/export logging into `activity_log`; append-only enforcement on `matter_events`; notification delivery + digest; staging environment; automated regression covering Acceptance Tests 1–7.

## Maintenance

Update this file at the end of every sprint. When the app must diverge from the Bible, add the item to "Conflicts to decide" rather than changing behavior quietly (Bible §Governance rule, §18).