# Eviction Flow Tracker

I want to create a system to help keep track of evictions - i have multiple customers who send me tenants to evict - i need to keep them abreast of the process - 5 day ,14 day, served, court dates, updates to files, etc. i need a admin and end user portal - heres more info: Build a production-ready MVP web app called “EvictFlow” for an eviction processing company that manages eviction cases for multiple landlord/property-manager clients in New York (Erie County focus, but configurable for future counties/states).

IMPORTANT:

- This app is a case management and client communication system.

- It does NOT provide legal advice.

- Legal deadlines and workflow rules must be configurable in admin settings (do not hardcode legal logic).

- Erie County / NY defaults should be preloaded, but editable.

TECH STACK / PLATFORM

- Use Lovable best practices.

- Backend: Supabase (Postgres, Auth, Storage, Realtime if helpful).

- Use Supabase Auth for login.

- Use Supabase Storage for case documents.

- Use Row Level Security (RLS) so clients only see their own cases.

- Mobile responsive UI.

- Clean professional UI (legal/admin portal feel, easy to scan, high trust).

APP GOAL

Create a multi-tenant eviction case tracking system with:

1) Admin portal (internal staff)

2) Client portal (landlords/property managers)

3) Case timelines/milestones

4) Document uploads and sharing

5) Court date tracking

6) Audit trail

7) Client-visible updates and notifications (start with in-app + email placeholders)

PRIMARY USERS / ROLES

1. Super Admin (internal owner)

   - Full access to all clients, cases, settings, templates, users

2. Admin Staff (internal team)

   - Manage cases, milestones, documents, court dates, notes

3. Client User (landlord/property manager)

   - View only their own cases, shared docs, status timeline, court dates

   - Cannot see internal notes or other clients’ data

MVP SCOPE

- Nonpayment eviction workflow first (NY / Erie County default)

- Configurable milestone templates (jurisdiction + case type)

- Client portal visibility

- Document management with internal/client visibility toggle

- Court events tracking

- Activity log / audit trail

- Basic notifications (in-app + email-ready structure)

NON-GOALS (MVP)

- No tenant portal

- No e-filing integration

- No legal advice generation

- No payment processing/invoicing

- No OCR

- No SMS in MVP (but leave notification architecture extensible)

NY / ERIE COUNTY DEFAULT WORKFLOW (CONFIGURABLE TEMPLATE)

Create a default workflow template for:

- Jurisdiction: New York

- County: Erie

- Case Type: Nonpayment

Default milestones (editable by admin):

1. Case Opened

2. 5-Day Internal Milestone (business process milestone, NOT a legal notice)

3. 14-Day Rent Demand Prepared

4. 14-Day Rent Demand Served

5. Proof of Service Uploaded

6. Waiting Period Complete / Ready to File

7. Petition Filed

8. Court Date Scheduled

9. Court Appearance

10. Court Outcome Logged

11. Case Resolved

12. Case Closed

Each milestone must support:

- status: pending / complete / overdue / skipped

- due_date

- completed_at

- completed_by

- notes

- client_visible (bool)

- order_index

- auto_offset_days (optional; used to calculate due dates from prior milestone)

LEGAL / COURT CONFIGURABILITY

- Do not hardcode one court.

- Add fields so each case can store:

  - court_name (e.g., Buffalo City Court Housing Part or other)

  - court_address

  - court_room

  - court_case_number / index_number

- Add Admin Settings for:

  - default notice days (e.g., 14)

  - reminder timings

  - milestone templates by jurisdiction/case type

- Add clear disclaimer in admin settings: “All legal workflows must be reviewed by counsel.”

CORE DATA MODEL (SUPABASE TABLES)

Create these tables with proper relationships, timestamps, and soft-delete flags where appropriate:

1) clients

- id (uuid)

- company_name

- contact_name

- email

- phone

- address_line1

- address_line2

- city

- state

- zip

- is_active

- created_at

- updated_at

2) profiles (extends auth users)

- id (uuid, matches auth user id)

- full_name

- email

- role (super_admin, admin, client)

- client_id (nullable; required for client users)

- is_active

- created_at

- updated_at

3) properties

- id (uuid)

- client_id (fk)

- address_line1

- address_line2

- city

- state

- zip

- county

- notes

- created_at

- updated_at

4) tenants

- id (uuid)

- full_name

- phone

- email

- mailing_address

- notes

- created_at

- updated_at

5) cases

- id (uuid)

- case_number (human-readable internal ID, e.g., EV-2026-0001)

- client_id (fk)

- property_id (fk)

- primary_tenant_id (fk)

- case_type (default: nonpayment)

- jurisdiction_state (default: NY)

- jurisdiction_county (default: Erie)

- court_name

- court_address

- court_case_number

- status (top-level state)

- sub_status

- assigned_admin_id (fk to profiles)

- opened_date

- closed_date

- priority (low/normal/high)

- is_on_hold (bool)

- hold_reason

- created_at

- updated_at

6) case_tenants (for multiple tenants on a case)

- id (uuid)

- case_id (fk)

- tenant_id (fk)

- is_primary (bool)

- created_at

7) milestone_templates

- id (uuid)

- template_name

- jurisdiction_state

- jurisdiction_county

- case_type

- is_default

- is_active

- created_at

- updated_at

8) milestone_template_items

- id (uuid)

- template_id (fk)

- milestone_key

- label

- order_index

- auto_offset_days (nullable)

- default_client_visible (bool)

- required_document_category (nullable)

- created_at

- updated_at

9) case_milestones

- id (uuid)

- case_id (fk)

- milestone_key

- label

- order_index

- due_date

- completed_at

- completed_by (fk to profiles)

- status (pending/complete/overdue/skipped)

- notes

- client_visible (bool)

- created_at

- updated_at

10) service_records

- id (uuid)

- case_id (fk)

- notice_type (e.g., 14-day demand)

- service_method (personal, substituted, conspicuous/nail-mail, certified_mail, other)

- service_date

- service_time

- served_by

- mailing_tracking_number

- affidavit_document_id (fk to documents, nullable)

- notes

- created_at

- updated_at

11) court_events

- id (uuid)

- case_id (fk)

- event_type (hearing, adjournment, judgment, warrant, other)

- start_at

- end_at

- court_name

- location

- virtual_link

- outcome

- notes

- next_event_at

- created_by (fk to profiles)

- created_at

- updated_at

12) documents

- id (uuid)

- case_id (fk)

- category (lease, rent_ledger, notice, proof_of_service, petition_filing, court_document, photo, correspondence, other)

- file_name

- file_path

- mime_type

- file_size

- version_number

- uploaded_by (fk to profiles)

- visible_to_client (bool)

- description

- created_at

- updated_at

13) case_notes

- id (uuid)

- case_id (fk)

- note_type (internal, client_update)

- content

- created_by (fk to profiles)

- created_at

- updated_at

14) activity_log

- id (uuid)

- case_id (fk, nullable for system events)

- user_id (fk to profiles)

- action_type

- entity_type

- entity_id

- old_value_json (jsonb)

- new_value_json (jsonb)

- metadata_json (jsonb)

- created_at

15) notifications

- id (uuid)

- recipient_user_id (fk to profiles)

- case_id (fk, nullable)

- title

- message

- channel (in_app, email)

- status (queued, sent, failed, read)

- read_at

- created_at

16) system_settings (or scoped settings tables)

- id (uuid)

- setting_key

- setting_value_json (jsonb)

- updated_by

- updated_at

STATUS MODEL (TOP-LEVEL)

Use a clear top-level status enum for cases:

- intake

- notice_preparation

- notice_served

- waiting_period

- ready_to_file

- filed

- court_scheduled

- in_court_process

- outcome_pending

- resolved

- closed

- on_hold

Allow sub_status text for flexibility.

REQUIRED RLS / SECURITY RULES

Implement robust RLS:

- super_admin/admin can read/write all records (internal role check)

- client users can only read:

  - their own client row

  - their own properties

  - their own cases

  - case_milestones where case belongs to their client and client_visible = true (or allow all but hide internal via flag)

  - documents where case belongs to their client and visible_to_client = true

  - case_notes where note_type = 'client_update' and case belongs to their client

  - court_events for their cases

  - notifications addressed to them

- client users cannot access internal notes, internal docs, or other clients

- log all mutations from admin users into activity_log

UI / PAGES (ADMIN PORTAL)

1) Login page

2) Admin Dashboard

   - KPI cards: Open Cases, Ready to File, Upcoming Court Dates, Overdue Milestones

   - Recent activity feed

   - “My Assigned Cases”

   - Filters by client / status / county

3) Cases List

   - Search

   - Filter chips (client, status, assigned admin, county, court date upcoming)

   - Columns: Case ID, Client, Tenant, Property, Status, Next Action, Assigned, Last Updated

4) Case Detail (main screen)

   Tabs or sections:

   - Summary

   - Timeline / Milestones

   - Documents

   - Service

   - Court

   - Notes

   - Activity

   Requirements:

   - Quick status update dropdown

   - Next action highlighted

   - Add milestone completion action

   - Add client-visible update action

   - Document upload with visibility toggle

   - Court date create/edit

5) New Case Intake Form

   - Create/select client

   - Property info

   - Tenant(s)

   - Case type

   - Assign admin

   - Apply milestone template

   - Upload initial docs

6) Clients List + Client Detail

   - Client users

   - Their cases

7) User Management (Super Admin)

8) Settings (Super Admin)

   - Milestone templates

   - Notification templates

   - Jurisdiction defaults

   - Legal disclaimer text

UI / PAGES (CLIENT PORTAL)

1) Login page

2) Client Dashboard

   - Cases by status

   - Upcoming court dates

   - Recent updates

3) Client Cases List

   - Search and filter

4) Client Case Detail

   - Current status

   - Client-visible milestone timeline

   - Shared documents

   - Court dates/events

   - Client updates / notes feed

   - Optional “Request Update” button (creates internal notification/task)

5) Profile page (basic)

CASE DETAIL EXPERIENCE REQUIREMENTS (VERY IMPORTANT)

On the admin case detail screen, make it easy to operate fast:

- A status header bar with:

  - Current status

  - Assigned admin

  - Next key date

  - “Mark next milestone complete” button

- Timeline should visually show:

  - completed milestones (check icon)

  - pending milestones

  - overdue milestones in red

- Documents should support:

  - upload

  - category selection

  - internal/client visibility toggle

  - version increment if same category/file replaced

- Notes:

  - separate internal note composer and client update composer

  - client update composer should automatically generate notification records

ACTIVITY LOG REQUIREMENTS

Write activity_log records for:

- case creation

- status changes

- milestone completion

- document uploads

- document visibility changes

- court event creation/edit

- note creation

- assignment changes

- settings changes

NOTIFICATIONS (MVP)

Implement in-app notifications table and UI.

Also prepare email notification hooks (can be placeholder functions if direct sending isn’t supported in one pass).

Trigger notifications when:

- case opened (client)

- major status changed (client + assigned admin as applicable)

- court date scheduled/changed (client + assigned admin)

- new client-visible update added (client)

- milestone overdue (assigned admin/internal)

If email sending is not fully wired, create a notification service abstraction so it can be connected later.

FILE STORAGE

Use Supabase Storage bucket(s):

- case-documents

Store by path pattern:

- client/{client_id}/case/{case_id}/{category}/{timestamp}_{filename}

Generate secure URLs for client-visible files.

Do not expose internal-only files to clients.

SEARCH / FILTERS

Provide useful search and filtering:

- Case ID

- Tenant name

- Property address

- Client name (admin only)

- Status

- Court date range

- Overdue only

SAMPLE / SEED DATA

Create seed/demo data for:

- 2 clients

- 6 cases total

- mix of statuses (intake, notice_served, filed, court_scheduled, resolved)

- sample milestones and documents

- at least 1 upcoming court date

- at least 1 overdue milestone

This helps demo the workflow immediately.

DEFAULT ERIE COUNTY / NY SETTINGS (SEED)

Preload settings examples:

- jurisdiction_state = NY

- jurisdiction_county = Erie

- case_type = nonpayment

- default_notice_days = 14

- reminder_offsets = [3,1]

- courts list sample:

  - Buffalo City Court Housing (sample label)

  - Other Erie local court (custom entry)

Keep all editable in Settings.

LEGAL SAFETY / COPY

Add visible copy in admin settings and optionally case screens:

“This software is for case tracking and communication only. It does not provide legal advice. Users are responsible for confirming legal requirements with counsel.”

UX STYLE

- Professional legal operations dashboard feel

- Clear visual hierarchy

- Fast scanning tables

- Strong status badges

- Clean timeline component

- Minimal clutter

- Mobile responsive for client users

- Make the case detail screen excellent (this is the core workflow)

DELIVERABLES TO GENERATE

1) Full app UI and flows

2) Supabase schema + migrations

3) RLS policies

4) Auth flows for admin/client

5) File upload + storage integration

6) Seed data

7) Notification framework

8) Activity logging hooks

ACCEPTANCE CRITERIA (MVP)

- Admin can create a case and assign a client/property/tenant

- Case gets a default milestone timeline from template

- Admin can mark milestones complete and upload docs

- Admin can enter service details and proof of service

- Admin can schedule court events and log outcomes

- Client can log in and only see their own cases

- Client can see status, timeline, shared docs, and court dates

- Internal notes/docs are hidden from client

- Activity log captures key changes

- Overdue milestones are visibly flagged

- Admin can manage milestone templates/settings for Erie County defaults

If anything is too large for one generation, prioritize in this order:

1) Auth + roles + RLS

2) Cases + case detail + milestones

3) Documents + visibility

4) Court events + notes

5) Dashboard + notifications + settings

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://eviction-compass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83c9df18-fed0-4a36-9dea-129a0c9cfc0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
