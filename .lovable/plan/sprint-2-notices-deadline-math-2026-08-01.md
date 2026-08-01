# Sprint 2 — Notices + Deadline Math

Turns the intake data captured in Sprint 1 into statutory notices with automatic date math. Nothing from Sprint 1 or the collections/court modules is redesigned.

## What a user gets at the end

From a matter, an admin (or a client on their own matter, depending on stage) can create a **5-Day Late Notice** or a **14-Day Demand**, see the amount owed pulled straight from the rent ledger, record how and when it was served, and get automatically computed **cure-by** and **eligible-to-file** dates. The matter timeline records each notice created, served, and expired, and the case dashboard shows the next deadline.

## New data

**Notices** — one row per notice issued on a matter: notice type (5-day late, 14-day demand, notice to quit, other), amount demanded, period covered (through-date), the date it was prepared, who prepared it, generated document reference, and status (draft, issued, served, cure period running, expired/ripe, cured, withdrawn).

**Notice rules** — a data-driven table keyed by state / county / notice type holding: cure period days, whether the count is calendar or business days, added mailing days per service method, and the minimum days that must pass before filing. No jurisdiction logic hardcoded in components. Seeded with NY / Erie values matching the existing `jurisdiction_defaults` setting, and editable in Admin Settings.

**Service records tied to notices** — the existing `service_records` table gains a nullable `notice_id`, so a service event attaches to the notice it delivered instead of floating on the case. Existing rows stay valid.

**Computed dates on the notice** — `cure_by_date` and `eligible_to_file_date`, calculated in the database from the service date + service method + the matching notice rule, so every surface (admin, client, dashboard) reads the same number.

## Amount owed

The demanded amount defaults to the ledger balance as of the notice date, computed from `ledger_entries` (charges minus payments and credits) via a database function. The admin can override it, and the override is recorded alongside the computed figure so the two are never confused.

## Document output

Each notice renders from a text template stored in settings (per state/county/notice type), with merge fields for landlord, tenant, property, unit, amount, period, and dates. Output is generated in-browser as a printable/downloadable file and stored in the existing private `case-documents` bucket as a `notice` category document, linked back to the notice row.

## UI

- **Notices tab on case detail** (admin): list of notices with status, amount, service info, cure-by and eligible-to-file dates; create-notice dialog; record-service dialog; preview and download.
- **Client portal**: read-only view of notices on their own matters, showing type, date, amount, and deadlines. Internal-only fields stay hidden.
- **Admin dashboard**: a "Deadlines" panel — notices whose cure period expires soon and matters that are ripe to file.
- **Timeline**: `notice_created`, `notice_served`, `notice_cure_expired` events.

## Security

- Admins manage notices and notice rules.
- Clients read notices for their own matters only, and may create a notice only while the matter is still a draft they own (same `is_draft_matter_owner` rule as Sprint 1).
- Notice rules are readable by admins only.
- All new tables get explicit grants and RLS policies before any policy is written.

## Explicitly not touched

Collections, payment plans, counsel, milestones, the intake wizard's ten steps, auth, and the design system.

## Technical notes

- Migration order: enums (`notice_type`, `notice_status`) → `notice_rules` → `notices` → `service_records.notice_id` → ledger balance function → deadline-calculation function and trigger → grants → RLS enable → policies.
- Deadline math lives in one security-definer function so admin UI, client UI, and dashboards can never disagree; a trigger recomputes on service insert/update.
- Business-day counting handled in SQL with a simple weekday skip; holiday tables are out of scope for this sprint.
- Templates stored as settings rows, not code, per the data-driven rule.
- No new dependencies.

## After this sprint

Regression pass over case detail, the client portal, the intake wizard, and every new policy before Sprint 3 (attorney referral + petition/filing).
