

# EvictFlow — Eviction Case Management System

## Overview
A multi-tenant eviction case tracking and client communication platform for an eviction processing company serving landlords and property managers in Erie County, NY (expandable to other jurisdictions). **Not legal advice software** — a case management and communication tool.

---

## Phase 1: Foundation (Auth, Database, Roles, RLS)

### Supabase Setup (Lovable Cloud)
- Full database schema with all 16 tables as specified (clients, profiles, properties, tenants, cases, case_tenants, milestone_templates, milestone_template_items, case_milestones, service_records, court_events, documents, case_notes, activity_log, notifications, system_settings)
- Enum types for roles (`super_admin`, `admin`, `client`), case status, priority, milestone status, etc.
- Auto-incrementing human-readable case numbers (EV-2026-0001)

### Authentication & Roles
- Supabase Auth with email/password login
- Separate `user_roles` table (security best practice) with `has_role()` security definer function
- Profile auto-creation on signup via database trigger
- Invite-based account creation by admin + self-registration with invite codes for clients

### Row Level Security
- Super admin / admin: full read/write on all tables
- Client users: read-only access scoped to their own client_id
- Client-visible filtering on milestones, documents, and notes
- Internal notes/docs completely hidden from client users

### Seed Data
- 2 sample clients with contact info
- 6 cases across various statuses (intake → resolved)
- Pre-populated milestone timelines, sample documents metadata, court events
- At least 1 overdue milestone and 1 upcoming court date
- Erie County NY default workflow template with all 12 milestones

---

## Phase 2: Admin Portal

### Login Page
- Clean, professional login screen with EvictFlow branding
- Role-based redirect (admin → admin dashboard, client → client dashboard)

### Admin Dashboard
- **KPI Cards**: Open Cases, Ready to File, Upcoming Court Dates, Overdue Milestones
- **Recent Activity Feed** from activity_log
- **My Assigned Cases** quick list
- **Filters** by client, status, county

### Cases List
- Searchable, filterable table with columns: Case ID, Client, Tenant, Property, Status, Next Action, Assigned Admin, Last Updated
- Filter chips for client, status, assigned admin, county, upcoming court date
- Quick-scan layout optimized for fast operations

### Case Detail (Core Workflow Screen)
- **Status Header Bar**: Current status, assigned admin, next key date, "Mark Next Milestone Complete" button
- **Tabs/Sections**:
  - **Summary**: Case info, client, property, tenant(s), court details
  - **Timeline/Milestones**: Visual timeline with completed (✓), pending, and overdue (red) milestones. Click to complete with notes.
  - **Documents**: Upload with category selection, internal/client visibility toggle, version tracking
  - **Service**: Service records with method, date, tracking, affidavit link
  - **Court**: Court events (hearings, adjournments, outcomes), virtual links, next event
  - **Notes**: Separate internal note and client update composers. Client updates auto-generate notifications.
  - **Activity**: Full audit trail for the case

### New Case Intake Form
- Create or select existing client
- Property information (create or select)
- Tenant(s) with primary designation
- Case type selection, jurisdiction defaults
- Admin assignment
- Milestone template application (auto-calculates due dates)
- Initial document uploads

### Clients Management
- Clients list with search
- Client detail: contact info, their users, their cases

### User Management (Super Admin)
- Create/invite admin staff and client users
- Invite link generation for client self-registration
- Activate/deactivate users
- Assign client users to client organizations

### Settings (Super Admin)
- **Milestone Templates**: CRUD for workflow templates by jurisdiction + case type
- **Jurisdiction Defaults**: Default notice days, reminder offsets, courts list
- **Notification Templates**: Placeholder for email templates
- **Legal Disclaimer**: Editable disclaimer text
- Visible warning: *"This software is for case tracking and communication only. It does not provide legal advice."*

---

## Phase 3: Client Portal

### Client Dashboard
- Cases grouped by status
- Upcoming court dates
- Recent updates/notifications

### Client Cases List
- Search and filter (only their cases)

### Client Case Detail
- Current status with visual indicator
- Client-visible milestone timeline only
- Shared documents (client-visible only)
- Court dates and events
- Client updates/notes feed
- **"Request Update" button** → creates internal notification for admin

### Client Profile
- Basic profile editing (name, contact)

---

## Phase 4: Documents, Notifications & Activity

### File Storage
- Supabase Storage bucket `case-documents`
- Path pattern: `client/{client_id}/case/{case_id}/{category}/{timestamp}_{filename}`
- Secure URL generation for client-visible files
- Internal files never exposed to client users

### Notifications (In-App + Email-Ready)
- In-app notification bell with unread count
- Notification triggers: case opened, status change, court date scheduled/changed, new client update, milestone overdue
- Email notification service abstraction (placeholder functions ready for future integration)

### Activity Logging
- Automatic logging for: case creation, status changes, milestone completion, document uploads, visibility changes, court events, notes, assignment changes, settings changes

---

## Design & UX

- **Professional legal operations dashboard** aesthetic — high trust, clean, minimal clutter
- Strong status badges with color coding
- Clear visual hierarchy for fast scanning
- Clean timeline component for milestones
- Mobile responsive (especially client portal)
- Consistent navigation with sidebar for admin, simplified nav for clients
- Dark/light mode support

---

## Erie County / NY Defaults (Pre-loaded)

- Default nonpayment workflow template with 12 milestones
- Auto-offset days between milestones where applicable
- Sample courts: Buffalo City Court Housing Part
- Default notice period: 14 days
- Reminder offsets: 3 days, 1 day before due dates
- All fully editable in admin settings

