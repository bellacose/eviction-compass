# Sprint 1 — Matter Intake Foundation

Extends Evict OS without redesigning it. Existing routes, portals, collections, court, counsel, milestones, dashboards, and RLS stay exactly as they are. This sprint adds the missing front half of the workflow: unit → tenancy → ledger → complete intake.

## What a user gets at the end

A landlord (client user) or admin opens a 10-step Matter Intake Wizard, works through client → property → unit → tenant → tenancy → matter info → rent ledger → documents → legal questions → review, and submits the matter for attorney review. Progress saves as a draft after every step, so the wizard can be closed and resumed. Admins see submitted matters arrive in their queue.

## New data

**Units** — belong to a property: unit number, description, bedrooms, bathrooms, monthly rent, active flag. Cases gain a unit reference (nullable, so all 6 existing cases stay valid).

**Tenancies** — the new link between a tenant and a unit: property, unit, tenant, lease start/end, lease type, monthly rent, security deposit, and occupancy status (Current Tenant / Former Tenant / Evicted / Unknown). Cases reference a tenancy. Existing `case_tenants` stays untouched so nothing breaks.

**Rental application detail on tenants** — identity, employment, vehicles, emergency contacts, references, banking, previous address, driver licence. Each group is stored as structured JSON carrying `value`, `source`, `verified`, and `verification_date` per field, so verification state is captured without adding 60 columns.

**Matter type on cases** — Non-payment, Holdover, Lease Violation, Former Tenant Collection, Judgment Collection, Other. Plus first unpaid month, last payment date, current balance, and the nine legal-question answers.

**Ledger** — reuses the existing `ledger_entries` table, extended with payment and credit amounts so the wizard's Date / Description / Charge / Payment / Credit / Running Balance grid works. Running balance is computed, not stored.

**Matter timeline** — a new `matter_events` table recording every meaningful action (tenant added, lease uploaded, matter created, ledger updated, notice sent, attorney assigned, court filed, judgment entered, collection submitted, payment received) with actor, timestamp, and an internal-only flag.

**Case status** — two new values added to the existing enum: `draft` and `attorney_review`. All 12 current values are preserved.

## Security model for this sprint

Clients today can only read. They now also get scoped write access, enforced in the database:

- Clients may create and edit their own matters **only while status is `draft`**, and only for their own `client_id`.
- Clients may create properties, units, tenants, and tenancies belonging to their own client, and upload documents to their own draft matters.
- Once a matter leaves `draft` (submitted for attorney review), client writes are blocked at the policy level — read-only from then on.
- Clients still cannot see other landlords, internal notes, internal documents, or non-client-visible milestones. None of the existing restrictions are relaxed.
- Storage: a new client-upload policy scoped to `case-documents` paths owned by the client's own draft matters. The existing admin policies and the client read policy are unchanged.

## The wizard

One route, `/matters/new`, reachable from both portals (`/admin/cases/new` keeps working and redirects into it). A single wizard shell component drives ten steps; each step is its own small component. State persists to a draft case row after every step — no local-only data, no mock APIs.

Steps 2, 3, and 4 each offer "select existing" or "create new" inline, so a landlord never has to leave the wizard to add a property, unit, or tenant. Step 10 shows the full summary with jump-back-to-edit links, then Submit moves the case from `draft` to `attorney_review` and writes a timeline event.

Address entry reuses the existing `AddressAutocomplete` component. Document upload reuses the existing `documents` table and private `case-documents` bucket.

## Dashboard and detail changes

Case list and case detail gain: current stage, next required action, days delinquent, current balance, occupancy status, matter type, assigned attorney, collection status. These are derived from existing data plus the new fields — no new aggregation tables.

A Timeline tab appears on case detail (admin sees all events, clients see non-internal events only).

## Explicitly not touched

Collections module, court events, counsel, milestones, notifications, admin dashboard layout, client portal navigation, auth, existing RLS policies, and the design system. Nothing is deleted.

## Technical notes

- Migration order: enums → `units` → `tenancies` → column additions on `cases`, `tenants`, `ledger_entries` → `matter_events` → GRANTs → RLS enable → policies. Every new public table gets explicit GRANTs to `authenticated` and `service_role` before policies.
- All new columns on existing tables are nullable or defaulted so current rows and current code keep working.
- New helper: a `is_draft_matter_owner(case_id)` security-definer function to keep the client-write policies simple and non-recursive.
- Wizard state uses a typed reducer, one save function per step, and Supabase types regenerate after the migration.
- No new dependencies.

## After this sprint

Stop and run a regression pass over every affected route, component, migration, and policy before starting Sprint 2 — fixing defects only.
