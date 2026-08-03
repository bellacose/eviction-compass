# Surface Matter Type and Status on a Matter

## What you're seeing today

- **Quick Case** (`New Case`) never asks for a matter type. It only asks for an "Eviction Reason" and a "Case Type", so every quick case is created with the default matter type — that's why Gabby Moore's record has nothing you can point at.
- **Case Detail** shows the status only as a small colored badge next to the case number, and the Summary card shows "Case Type", not "Matter Type". Status can only be changed through the workflow actions panel (by design), so there is no obvious "status field".

## What to change

1. **Quick Case form**: add a required **Matter Type** dropdown (Non-payment, Holdover, Lease Violation, Former Tenant Collection, Judgment Collection, Other) and save it on the new matter. Default it to Non-payment.

2. **Case Detail — Case Info card**: show **Matter Type** as its own row and **Status** as a labeled row (badge), alongside Case Type, Jurisdiction, Opened, and Priority. No more hunting for the badge in the header.

3. **Change Matter Type inline**: admins get an edit control on the Matter Type row to switch it (e.g. Non-payment -> Former Tenant Collection for Gabby). The change writes to the matter and records a timeline event so the audit trail shows who changed it and when.

4. **Status stays workflow-controlled**: it remains read-only on the summary card. A short note under it points to the Next Action / Matter Actions panel, which is the only sanctioned way to move status (the database rejects direct status edits).

5. **Cases list**: show the matter type as a column/badge so the list distinguishes evictions from collection matters at a glance.

## Technical notes

- `cases.matter_type` already exists (`matter_type` enum) with labels in `src/lib/matter.ts` (`MATTER_TYPES`, `MATTER_TYPE_LABELS`) — reuse those, no new database work.
- Files touched: `src/pages/admin/NewCase.tsx`, `src/pages/admin/CaseDetail.tsx`, `src/pages/admin/CasesList.tsx`.
- Matter type edits go through a plain update on `cases` plus `logMatterEvent` from `src/lib/matter.ts`; status is untouched because `trg_guard_case_status` blocks direct status writes.
