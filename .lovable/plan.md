

# Court Events CRUD, Service Records CRUD, and Document Download

## Overview

Add full create/edit/delete functionality for court events and service records on the admin case detail page, plus document download and visibility toggle for both admin and client views.

---

## 1. Court Events CRUD (Admin Case Detail - Court Tab)

**Current state:** Read-only list of court events.

**Changes to `src/pages/admin/CaseDetail.tsx`:**

- Add an "Add Court Event" button next to the Court tab header
- Create a Dialog form with fields:
  - Event type (select from enum: hearing, adjournment, judgment, warrant, other)
  - Court name (text)
  - Start date/time (datetime-local input)
  - End date/time (optional)
  - Location (text)
  - Virtual link (optional, text)
  - Outcome (optional, text -- useful for editing after the event)
  - Notes (textarea)
- Each existing court event row gets Edit and Delete buttons
- Edit opens the same dialog pre-filled
- Delete shows a confirmation dialog
- All operations call `supabase.from("court_events").insert/update/delete` then reload

---

## 2. Service Records CRUD (Admin Case Detail - Service Tab)

**Current state:** Read-only list of service records.

**Changes to `src/pages/admin/CaseDetail.tsx`:**

- Add an "Add Service Record" button next to the Service tab header
- Create a Dialog form with fields:
  - Notice type (text, default "14-day demand")
  - Service method (select from enum: personal, substituted, conspicuous_nail_mail, certified_mail, other)
  - Service date (date input)
  - Service time (time input, optional)
  - Served by (text)
  - Mailing tracking number (optional)
  - Notes (textarea)
- Each existing record row gets Edit and Delete buttons
- Edit opens the same dialog pre-filled
- Delete shows a confirmation dialog

---

## 3. Document Download and Visibility Toggle

**Current state:** Documents are listed but cannot be downloaded or have visibility toggled.

**Changes to admin `CaseDetail.tsx` Documents tab:**
- Add a Download button to each document row using `supabase.storage.from("case-documents").createSignedUrl(doc.file_path, 60)` and opening it in a new tab
- Add a toggle/button to flip `visible_to_client` on each document
- Add category and description fields to the upload flow (dialog instead of raw file input)

**Changes to client `ClientCaseDetail.tsx`:**
- Add a Download button on each document for client users (same signed URL approach)

---

## 4. Storage RLS Policy

A database migration will add a storage policy so authenticated users can read from the `case-documents` bucket. Currently the bucket is private with no read policies, which would block signed URL generation from the client.

**Migration SQL:**
```sql
CREATE POLICY "Authenticated users can read case documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'case-documents');
```

---

## Technical Details

### Files modified:
- `src/pages/admin/CaseDetail.tsx` -- major changes: add dialogs for court events and service records CRUD, document download/visibility toggle, enhanced upload dialog
- `src/pages/client/ClientCaseDetail.tsx` -- add download button to documents

### New components (extracted for readability):
- `src/components/admin/CourtEventDialog.tsx` -- form dialog for add/edit court event
- `src/components/admin/ServiceRecordDialog.tsx` -- form dialog for add/edit service record

### Database migration:
- Storage RLS policy for `case-documents` bucket read access

### Enums used (already exist):
- `court_event_type`: hearing, adjournment, judgment, warrant, other
- `service_method`: personal, substituted, conspicuous_nail_mail, certified_mail, other
- `document_category`: lease, rent_ledger, notice, proof_of_service, petition_filing, court_document, photo, correspondence, other

