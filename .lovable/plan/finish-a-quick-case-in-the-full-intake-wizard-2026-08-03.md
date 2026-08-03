# Finish a Quick Case in the full intake wizard

## Short answer

Yes — and the capability already exists, it's just not reachable from the case page. The full wizard route accepts any matter id (`/admin/matters/<case id>`), and admins are never locked out of it, even after submission. There is simply no link to it from the case detail screen, so a Quick Case looks like a dead end.

## What's missing on a Quick Case

Quick Case captures client, property address, tenants, matter type, priority, and military verification. The full intake also covers unit, tenancy/lease terms, matter financial detail, rent ledger, documents, and the legal questionnaire — none of which Quick Case collects.

## The change

1. Add a **"Complete full intake"** button in the matter header card on the admin case detail page, linking to `/admin/matters/<id>`.
2. Show it for admins on any matter; label it "Open intake wizard" once the matter has already been submitted, so it reads as review/edit rather than unfinished work.
3. On the client case detail page, show the same link only while the matter is still a draft (clients are locked out after submission by policy).
4. In the wizard, when a matter arrives with no recorded intake step (the Quick Case situation), start at step 1 and surface a one-line note that this matter was started as a Quick Case so the remaining steps can be filled in.

## Technical notes

- Files: `src/pages/admin/CaseDetail.tsx` (header button), `src/pages/client/ClientCaseDetail.tsx` (draft-only button), `src/pages/MatterIntake.tsx` (starting-step note).
- No database, RLS, or route changes — `matters/:id` is already registered for both admin and client, and the wizard's save function patches the existing case row.
- Status is untouched: reopening a Quick Case in the wizard edits fields only; it does not move the matter back to draft. The Review step's submit action stays governed by the existing transition rules.