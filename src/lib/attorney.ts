import { supabase } from "@/integrations/supabase/client";

export type AttorneyStatus = "invited" | "active" | "inactive" | "suspended";

/** Scope of a counsel assignment on a matter. */
export type AssignmentScope = "attorney_only" | "firm";

export type MatterChangeClass = "hard" | "soft";

export type ReferralPacketStatus =
  | "draft"
  | "issued"
  | "approved"
  | "superseded"
  | "invalidated"
  | "withdrawn";

/** Bump when the attorney portal terms change; forces re-acknowledgement for new activations. */
export const PORTAL_TERMS_VERSION = "2026-08-02";

export interface AttorneyPrincipal {
  id: string;
  userId: string | null;
  status: AttorneyStatus;
  isActive: boolean;
  firmId: string | null;
  firmIds: string[];
  isFirmAdmin: boolean;
  /** Linked to an auth user but has not completed the explicit activation step. */
  activationRequired: boolean;
  activationAcknowledgedAt: string | null;
}

export interface CaseAssignment {
  caseId: string;
  counselId: string;
  firmId: string | null;
  scope: AssignmentScope;
  unassignedAt: string | null;
}

export const ATTORNEY_STATUSES: AttorneyStatus[] = ["invited", "active", "inactive", "suspended"];

export const ASSIGNMENT_SCOPES: { value: AssignmentScope; label: string; description: string }[] = [
  {
    value: "attorney_only",
    label: "This attorney only",
    description: "Only the named attorney can open the matter.",
  },
  {
    value: "firm",
    label: "Entire firm",
    description: "Any active attorney at the assigned firm can open the matter.",
  },
];

/** An attorney is a principal only while linked to an auth user AND active. */
export function isActivePrincipal(p: AttorneyPrincipal | null): boolean {
  return !!p && !!p.userId && p.status === "active" && p.isActive;
}

/** Linked, not deactivated, but still needs to accept the portal terms. */
export function needsActivation(p: AttorneyPrincipal | null): boolean {
  return !!p && !!p.userId && p.isActive && p.status === "invited";
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
    return a.scope === "firm" && !!a.firmId && p.firmIds.includes(a.firmId);
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
    .select("id, user_id, status, is_active, firm_id, is_firm_admin, activation_acknowledged_at")
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
    activationRequired: data.status === "invited" && data.is_active,
    activationAcknowledgedAt: (data as any).activation_acknowledged_at ?? null,
  };
}

/**
 * Sign-in only links the invited counsel record to the auth user.
 * Activation stays a deliberate, separate step.
 */
export async function linkAttorneyUser(userId: string): Promise<AttorneyPrincipal | null> {
  await supabase.rpc("link_attorney_user" as any);
  return fetchAttorneyPrincipal(userId);
}

export async function activateAttorneyAccount(input: {
  barNumber?: string | null;
  barJurisdictions?: string[] | null;
  accepted: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("activate_attorney_account" as any, {
    _terms_version: PORTAL_TERMS_VERSION,
    _accept: input.accepted,
    _bar_number: input.barNumber?.trim() || null,
    _bar_jurisdictions: input.barJurisdictions?.length ? input.barJurisdictions : null,
  });
  if (error) throw error;
}

export function packetStatusTone(
  status: ReferralPacketStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "approved":
      return "default";
    case "issued":
      return "secondary";
    case "invalidated":
      return "destructive";
    default:
      return "outline";
  }
}

/** A packet is only actionable while it is the live, uninvalidated version. */
export function isPacketCurrent(p: { status: ReferralPacketStatus } | null | undefined): boolean {
  return !!p && (p.status === "issued" || p.status === "approved");
}

/**
 * Hard changes invalidate an existing attorney approval; soft changes only
 * flag the current packet for re-review. Mirrors public.record_matter_change().
 */
export function classifyChange(
  rules: { change_key: string; change_class: MatterChangeClass; is_active: boolean }[],
  changeKey: string,
): MatterChangeClass {
  const rule = rules.find((r) => r.change_key === changeKey && r.is_active);
  return rule?.change_class ?? "soft";
}

export function changeInvalidatesApproval(
  rules: { change_key: string; change_class: MatterChangeClass; is_active: boolean }[],
  changeKey: string,
): boolean {
  return classifyChange(rules, changeKey) === "hard";
}

export async function recordMatterChange(
  caseId: string,
  changeKey: string,
  detail?: string,
  metadata?: Record<string, unknown>,
): Promise<{ change_class: MatterChangeClass; invalidated_approval: boolean } | null> {
  const { data, error } = await supabase.rpc("record_matter_change" as any, {
    _case_id: caseId,
    _change_key: changeKey,
    _detail: detail ?? null,
    _metadata: (metadata ?? {}) as any,
  });
  if (error) throw error;
  return (data as any) ?? null;
}

export async function issueReferralPacket(
  caseId: string,
  counselId?: string | null,
  notes?: string,
) {
  const { data, error } = await supabase.rpc("issue_referral_packet" as any, {
    _case_id: caseId,
    _counsel_id: counselId ?? null,
    _notes: notes ?? null,
  });
  if (error) throw error;
  return data as any;
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