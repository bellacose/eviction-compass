

# Clients CRUD + Client Portal User Management

## What We're Building

Two connected features:
1. Full create/read/update/delete for Client organizations
2. The ability to manage client portal users (invite, link to client, activate/deactivate) from within the client detail page

This means admins can go to Clients, create a new client company, then from that client's detail page invite a user who will get their own login to the client portal.

---

## Changes

### 1. Client Detail Page (new: `/admin/clients/:id`)

A new page showing:
- Editable client info form (company name, contact name, email, phone, address fields, active status)
- Save button to update
- A "Client Portal Users" section listing all profiles linked to this client (`profiles.client_id`)
- An "Invite User" button that opens a dialog to create a new client portal user

### 2. New Client Dialog (on Clients list page)

- "Add Client" button at top of the clients list
- Dialog/form with fields: company name, contact name, email, phone, address
- On submit, inserts into the `clients` table

### 3. Edit Client (on Client Detail page)

- Pre-filled form with all client fields
- Save changes updates the `clients` table
- Toggle active/inactive status

### 4. Client Portal User Invitation (on Client Detail page)

- "Invite User" button opens a dialog
- Fields: full name, email
- On submit:
  - Creates the user account via a backend function (edge function using the service role key to call `supabase.auth.admin.createUser`)
  - Sets their `client_id` on the profile
  - Assigns the `client` role in `user_roles`
- The invited user gets an email to set their password and can then log into the client portal

### 5. Deactivate/Reactivate Users

- Toggle button on each user row in the client detail page
- Updates `profiles.is_active`

### 6. Route Updates

- Add `/admin/clients/:id` route in App.tsx
- Make client rows in ClientsList clickable (link to detail page)

---

## Technical Details

### New Files
- `src/pages/admin/ClientDetail.tsx` — Client detail page with edit form + users section
- `supabase/functions/invite-user/index.ts` — Edge function to create user accounts server-side (required because client-side can't create users for others)

### Modified Files
- `src/pages/admin/ClientsList.tsx` — Add "New Client" button/dialog, make rows clickable
- `src/App.tsx` — Add `/admin/clients/:id` route
- `src/components/admin/AdminSidebar.tsx` — No changes needed (already has Clients nav item)

### Edge Function: `invite-user`
- Accepts: `{ email, full_name, client_id, role }` 
- Uses service role key to call `supabase.auth.admin.createUser`
- Updates the profile's `client_id`
- Inserts into `user_roles` with the `client` role
- Returns success/error
- Protected: only callable by authenticated admins (verified via `is_admin()` check)

### Database
- No schema changes needed — existing tables support everything
- Clients table already has all address fields, active status
- Profiles already has `client_id` foreign key
- User roles table already supports the `client` role

