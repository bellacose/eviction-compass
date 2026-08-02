import { supabase } from "@/integrations/supabase/client";

export type AttorneyStatus = "invited" | "active" | "inactive" | "suspended";

export interface AttorneyPrincipal {
  id: string;
  userId: string | null;
  status: AttorneyStatus;
  isActive: boolean;
  firmId: string | null;
  firmIds: string[];
  isFirmAdmin: boolean;
}

export interface CaseAssignment {
  caseId: string;
  counselId: string;
  firmId: string | null;
  allowFirmAccess: boolean;
  unassignedAt: string | null;
}

export const ATTORNEY_STATUSES: AttorneyStatus[] = ["invited", "active", "inactive", "suspended"];

/** An attorney is a principal only while linked to an auth user AND active. */
export function isActivePrincipal(p: AttorneyPrincipal | null): boolean {
  return !!p && !!p.userId && p.status === "active" && p.isActive;
}

/**
 * Pure mirror of public.attorney_can_access_case(). The database remains
 * authoritative; this exists so the UI can hide what the server would deny.
 */
export function attorneyCanAccessCase(
  principal: AttorneyPrincipal | null,
  assignments: CaseAssignment[],
  caseId: string,
): boolean {
  if (!isActivePrincipal(principal) || !caseId) return false;
  const p = principal as AttorneyPrincipal;
  return assignments.some((a) => {
    if (a.caseId !== caseId || a.unassignedAt) return false;
    if (a.counselId === p.id) return true;
    return !!a.allowFirmAccess && !!a.firmId && p.firmIds.includes(a.firmId);
  });
}

export function accessibleCaseIds(
  principal: AttorneyPrincipal | null,
  assignments: CaseAssignment[],
): string[] {
  const ids = new Set<string>();
  for (const a of assignments) {
    if (attorneyCanAccessCase(principal, assignments, a.caseId)) ids.add(a.caseId);
  }
  return [...ids];
}

/** Firm admins only ever administer firms they belong to. */
export function canAdministerFirm(principal: AttorneyPrincipal | null, firmId: string): boolean {
  if (!isActivePrincipal(principal)) return false;
  const p = principal as AttorneyPrincipal;
  return p.isFirmAdmin && p.firmIds.includes(firmId);
}

export async function fetchAttorneyPrincipal(userId: string): Promise<AttorneyPrincipal | null> {
  const { data } = await supabase
    .from("counsel")
    .select("id, user_id, status, is_active, firm_id, is_firm_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  const { data: memberships } = await supabase
    .from("firm_members")
    .select("firm_id, member_role")
    .eq("counsel_id", data.id);

  const firmIds = new Set<string>();
  if (data.firm_id) firmIds.add(data.firm_id);
  (memberships || []).forEach((m: any) => firmIds.add(m.firm_id));

  return {
    id: data.id,
    userId: data.user_id,
    status: data.status as AttorneyStatus,
    isActive: data.is_active,
    firmId: data.firm_id,
    firmIds: [...firmIds],
    isFirmAdmin:
      data.is_firm_admin ||
      (memberships || []).some((m: any) => m.member_role === "firm_admin"),
  };
}

export function statusTone(status: AttorneyStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "invited":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}