# Evict OS — Technical Readiness Audit (read-only, no changes made)

## A. Current architecture

React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui, single-page app. Backend is Lovable Cloud (Supabase): Postgres + Auth + Storage + Edge Functions. Client-side routing via react-router, data fetched directly from the browser with the Supabase JS client (no server API layer, no React Query usage despite the provider being mounted).

### Routes and screens

Public (no session required):
- `/login` — sign in / sign up (email + password)
- `/reset-password` — password reset landing
- everything else redirects to `/login` when signed out

Protected — Admin (only mounted when the user has `admin` or `super_admin`):
- `/admin` Dashboard, `/admin/cases`, `/admin/cases/new`, `/admin/cases/:id`
- `/admin/clients`, `/admin/clients/:id`, `/admin/counsel`
- `/admin/collections`, `/admin/collections/new`, `/admin/collections/:id`, `/admin/collection-agencies`
- `/admin/users`, `/admin/settings`

Protected — Client portal (role `client`):
- `/client`, `/client/cases`, `/client/cases/:id`, `/client/payments`
- `/client/collections`, `/client/collections/:id`, `/client/profile`

Other: `*` → NotFound. `src/pages/Index.tsx` still contains the default "Welcome to Your Blank App" template and is not routed (dead file).

Route protection is client-side only — routes are conditionally rendered based on roles from `user_roles`. The real enforcement is RLS on the database, which is correct, but there is no route guard component or server-side check.

### Authentication

Supabase Auth, email/password only. `AuthProvider` (`src/lib/auth.tsx`) holds session, profile, and roles; `onAuthStateChange` + `getSession` on boot; roles read from `user_roles`; helper flags `isAdmin`, `isSuperAdmin`, `isClient`. Signup is open and self-service (any visitor can create an account — they land with no role and no client, so they see nothing, but the account is created). Password reset works via `resetPasswordForEmail`. HIBP leaked-password protection is enabled. No Google/social auth, no MFA, no email domain restriction, no invite-only gate on the public signup tab.

## B. Existing working functionality (real Supabase data)

Every screen except `src/pages/Index.tsx` reads live data — there is no mock data, no hard-coded fixtures, and no fake arrays anywhere in `src/`.

Working CRUD:
- Clients — create (list page), update (detail), read. No delete.
- Cases — create (multi-step New Case, inserts property, tenant, case, milestones from template), read, update status/fields, milestone complete/skip, notes create, court events create/update/delete, service records, ledger entries, documents upload/delete.
- Counsel — create, update, read. Case-counsel assignment.
- Collections — matters create/update, debtor profile create/update, activities, payments, enforcement actions, agencies create/update, matter documents.
- Payment plans — create (installments auto-generate via DB trigger `trg_generate_installments`), ad-hoc scheduled payments, status updates.
- Users — invite via `invite-user` edge function, resend welcome/reset via `resend-user-email`, activate/deactivate.
- Settings — system settings update, milestone template item create/delete/update.
- Client portal — read-only cases, case detail, payments calendar + list with filters, collections, profile update, "request update" note insert.

Database triggers confirmed live: `updated_at` on 14 tables, `trg_generate_installments`, `tg_cmatter_number`, `tg_milestone_to_collection` (auto-creates a collection matter when a money-judgment milestone completes), `on_auth_user_created` → `handle_new_user`.

Edge functions: `invite-user` (verify_jwt = false), `resend-user-email`. No others.

Roles: `super_admin`, `admin`, `client` (enum `app_role`, stored in the separate `user_roles` table — correct pattern).

## C. Mock or incomplete functionality

Nothing is mocked, but several things are hollow:
- `Index.tsx` — unrouted default template page still in the repo.
- Notifications — table, policies, and enums exist; 0 rows, nothing writes to it, no UI, no email dispatch. Entirely unimplemented.
- Activity log — table exists with policies; 0 rows, no code writes to it. The audit trail is not actually recording anything.
- Ledger — `ledger_entries` exists and CaseDetail can add entries, but 0 rows and there is no rent-roll/recurring-charge concept, no running balance carried into the case or into collections.
- Documents — 0 rows; upload path works but no template generation, no notice PDF creation, no e-signature.
- Counsel — table and UI complete, 0 rows.
- Service records — dialog exists, 0 rows.
- Collections — full schema and full admin UI, 0 rows; the auto-create trigger has never fired.
- Client "request update" writes a note but no one is notified.
- Admin has no global Payments calendar (clients have one; admins do not).
- No units concept at all — properties are flat addresses.

Data volume today: 3 clients, 6 properties, 6 tenants, 6 cases, 72 milestones, 3 court events, 4 profiles / 4 roles, 1 milestone template, 3 system settings. Every other table is empty.

## D. Security findings

Good:
- RLS is enabled on all 28 public tables, and every table has at least one policy. No table is unprotected.
- All policies are scoped to the `authenticated` role — nothing is exposed to `anon`.
- Cross-organization isolation is enforced through `get_user_client_id(auth.uid())` on every client-facing policy, and that function now refuses lookups for other users.
- Role escalation is blocked: `user_roles` writes require `super_admin`; users can only read their own role.
- Internal data hidden from clients: internal notes (`note_type = 'internal'`), internal collection activities, `is_internal` documents, and non-`client_visible` milestones are all filtered at the database level.
- Storage bucket `case-documents` is private; client reads are joined against `documents.visible_to_client` and the owning client. Only admins can upload/update/delete.
- Only the publishable anon key is in `.env`; no service-role key or private key is in client code.

Issues to address:
1. Open public signup — anyone can create an account on the Sign Up tab. Harmless today (no role = no data) but it lets strangers create rows in `auth.users` and `profiles`.
2. `invite-user` runs with `verify_jwt = false`. If it does not internally verify that the caller is an admin, it is a public user-creation endpoint. This needs review.
3. `collection_agencies` is readable by every authenticated user (`qual: true`), including client users of other organizations. Agency contact details and default commission rates leak across tenants.
4. `milestone_templates` / `milestone_template_items` are readable by all authenticated users. Low sensitivity, but it exposes internal workflow configuration to client users.
5. Sensitive PII (SSN last 4, DOB, driver's licence, bank account last 4, employer, wages) is stored on `debtors` and `tenants` in plaintext columns with no column-level restriction and no access logging. Any admin can read all of it, and nothing records who looked.
6. No audit trail — `activity_log` is empty, so privileged actions (status changes, document deletion, PII views) are unrecorded.
7. Route protection is purely client-side; a bug that mis-reads roles renders the wrong shell. RLS saves the data, but the UI trust boundary is thin.

## E. Database findings

28 tables, all with RLS. Core entities and where they stand for the target workflow:

| Concept | Table | State |
|---|---|---|
| Landlord / owner | `clients` | present (company, contact, address, CSZ, active) |
| Property | `properties` | present (address, city, state, zip, county) |
| Unit | none | missing entirely |
| Tenant | `tenants` | present, but no lease, no tenancy period, no current/former flag |
| Lease | none | missing |
| Case | `cases` | strong (12-value status enum, jurisdiction, priority, hold, eviction reason, military verified) |
| Notice | `service_records` (partial) | no notice entity — only a service record with a free-text `notice_type` |
| Attorney | `counsel` + `case_counsel` | present, unused |
| Court proceedings | `court_events` | present (hearing/adjournment/judgment/warrant/other) |
| Judgment | none dedicated | represented only as a milestone key and a court event outcome |
| Warrant | none dedicated | same |
| Documents | `documents` | present with visibility flags |
| Collections | `collection_matters`, `debtors`, `collection_agencies`, `collection_payments`, `enforcement_actions`, `collection_activities` | schema very complete |
| Payments | `payment_plans`, `scheduled_payments` | present, case-scoped only |
| Rent ledger | `ledger_entries` | thin: date, charge type, description, amount. No balance, no rent roll |
| Tasks | none | missing entirely |
| Workflow | `milestone_templates`, `milestone_template_items`, `case_milestones` | present and data-driven |

Enums in use: `app_role`, `case_status` (12 values), `case_priority`, `milestone_status`, `note_type`, `document_category`, `service_method`, `court_event_type`, `notification_channel`, `notification_status`, `payment_frequency`, `payment_plan_status`, `scheduled_payment_status`, plus 6 collection enums.

Functions: `has_role`, `is_admin`, `get_user_client_id`, `handle_new_user`, `update_updated_at_column`, `collection_matter_balance` (interest + fee math), `collection_matter_set_number`, `generate_payment_plan_installments`, `auto_create_collection_from_judgment`.

Foreign keys are consistent and correctly point at `public.profiles` / `public.clients` rather than `auth.users` for user-facing joins (collections tables reference `auth.users` for `created_by`, which is acceptable).

## F. Workflow gaps

Target chain: landlord → property → unit → current/former tenant → rent ledger → 5-day late notice → 14-day demand + service → attorney referral → petition + court dates → judgment + warrant → final balance → agency placement → status and payment tracking.

Ten most important missing capabilities, in priority order:

1. **Units** — no unit entity. A property with 20 apartments cannot be modelled, so tenancies and ledgers cannot be attributed correctly.
2. **Tenancy / lease records** — no lease term, rent amount, deposit, move-in/move-out, or current-vs-former tenant status. This is the anchor the entire chain hangs from.
3. **Real rent ledger** — no monthly rent posting, no running balance, no payment-vs-charge reconciliation, no arrears calculation. The 5-day and 14-day notices depend on a computed amount owed.
4. **Notice entity and generation** — no notices table, no 5-day late notice, no 14-day demand, no statutory day counting, no document generation, no notice-to-service-to-deadline chain.
5. **Service tracking with deadline math** — `service_records` exists but no automatic "cure by" or "file after" date derived from service method and jurisdiction rules.
6. **Attorney referral workflow** — `counsel` exists but there is no referral action, referral packet, acceptance state, or handoff status.
7. **Petition / court filing entity** — no filing record, index number capture, filing fee, or petition document; court dates exist only as loose events.
8. **Judgment and warrant records** — no judgment amount, entry date, warrant issuance/execution dates, or eviction-completed state as first-class data. Everything is inferred from milestone keys.
9. **Final balance rollup into collections** — no computed handoff of ledger balance + court costs + fees into `collection_matters.principal`; the auto-create trigger inserts a matter with principal 0.
10. **Tasks, deadlines, and notifications** — no task entity, no assignment, no due-date engine, no in-app or email alerts. `notifications` is an empty shell.

Also missing but lower priority: admin global payments calendar, reporting/exports, bulk case actions, document templates, a working audit trail.

## G. Estimated MVP completion

**Approximately 45–50% complete**, measured on working functionality rather than visual design.

- Foundation (auth, roles, RLS, multi-tenant isolation, storage): ~90%
- Case management core (cases, milestones, court events, notes, documents): ~75%
- Collections module (schema and admin UI, unused in production): ~80% built, 0% exercised
- Payments (case-scoped plans and client calendar): ~60%
- Landlord → unit → tenancy → ledger → notice chain: ~15% — this is the largest gap and it is the front half of the target workflow
- Tasks, notifications, audit trail, reporting: ~5%

The back half of the pipeline (court, judgment, collections) is far more built out than the front half (unit, tenancy, ledger, notice), which is the reverse of the order work actually flows.

## H. Environments, source control, health

- Git: repository is Lovable-managed (`origin` on Lovable's private git host, plus an S3 secondary). Branch `main` plus two ephemeral edit branches. **No GitHub remote is connected.**
- Environments: **not separated.** One Supabase project serves everything. Preview (`id-preview--…lovable.app`) and production (`eviction-compass.lovable.app`) point at the same database. There is no staging, no seed/reset separation, and test data lives alongside real data. The published URL slug also still says `eviction-compass` while the app is branded Evict OS.
- TypeScript: clean, zero errors.
- Build: no build errors.
- Console: no application errors; the only preview noise is Vite HMR reconnect messages.
- Env vars: all required vars present (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, Google Maps browser key + tracking id). None missing.
- Dead code: `src/pages/Index.tsx` (unused template page).

## Recommended implementation order

1. Units + tenancy/lease records (with current vs former tenant status) — unblocks everything downstream.
2. Real rent ledger: recurring rent charges, payments, running balance, arrears as of a date.
3. Notices entity + 5-day late notice and 14-day demand, generated from the computed arrears, with document output.
4. Service records tied to notices, with jurisdiction-driven deadline math (cure-by, eligible-to-file).
5. Attorney referral workflow: refer a case to counsel, track acceptance and handoff.
6. Petition/filing record + court date management wired into case status.
7. Judgment and warrant as first-class records, including money judgment amount.
8. Final balance rollup that feeds `collection_matters.principal` when a matter is auto-created.
9. Tasks + deadline engine + notifications (in-app first, email second), and start writing `activity_log`.
10. Environment separation (a distinct staging/dev backend), GitHub connection, and the security tightening in section D (close public signup, verify `invite-user` authorization, scope `collection_agencies` reads).
