# Rework the Case Detail page

## What's wrong today

Matter Type and Status *are* on the page — but they sit inside the **Summary tab**, below eight stacked workflow panels (Next Action, Matter Actions, Holds, Eligibility, Filing Approval, Referral, Information Requests, Privileged Notes). By the time you scroll there, the page reads as a wall of legal-workflow machinery instead of "here is the matter."

## The fix: a real matter header

Replace the thin header (case number + tiny badge) with a **matter header card** pinned at the top of the page, before any workflow panel:

- Line 1: case number, tenant name, property address
- Line 2 — a labeled fact strip, always visible:
  - **Status** (badge, read-only, with a hint that it moves via Matter Actions)
  - **Matter Type** (badge + inline edit for admins)
  - **Client**
  - **Balance owed**
  - **Opened** date and **Priority**

Everything you asked about is then visible the moment the page loads, on every tab.

## Tame the workflow stack

- Collapse the eight workflow panels into one **Workflow** section that is collapsible, with Next Action always shown and the rest (Holds, Eligibility, Filing Approval, Referral, Information Requests, Privileged Notes) behind an expander.
- Move the collapsed workflow section **below** the tabs area so the matter facts and tabs come first.
- Keep the Summary tab, but drop the now-duplicated Status/Matter Type rows from Case Info and leave it as Case Type, Jurisdiction, Opened, Priority.

## Technical notes

- Single file: `src/pages/admin/CaseDetail.tsx`. No database or business-logic changes.
- New header card built from existing `StatusBadge`, `MATTER_TYPE_LABELS`, and the current `saveMatterType` handler (unchanged, still logs a timeline event).
- Workflow panels wrapped in shadcn `Collapsible`; the panel components themselves are untouched.
- Balance reuses the ledger data already loaded for the Ledger tab.