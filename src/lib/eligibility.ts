import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EligibilityConfirmationStatus = Database["public"]["Enums"]["eligibility_confirmation_status"];
export type FilingApprovalStatus = Database["public"]["Enums"]["filing_approval_status"];
export type BalanceSnapshotType = Database["public"]["Enums"]["balance_snapshot_type"];

export type EligibilityConfirmation = Database["public"]["Tables"]["filing_eligibility_confirmations"]["Row"];
export type FilingApproval = Database["public"]["Tables"]["filing_approvals"]["Row"];
export type BalanceSnapshot = Database["public"]["Tables"]["balance_snapshots"]["Row"];

export type ReviewActorRole = "admin" | "attorney" | "client";

/** Everything the pure guards need. Mirrors the server-side checks. */
export interface FilingReviewContext {
  actorRole: ReviewActorRole;
  /** counsel.id of the signed-in attorney principal, if any */
  actorAttorneyId?: string | null;
  isAssigned: boolean;
  referralStatus?: string | null;
  packetStatus?: string | null;
  blockingRequestCount: number;
  activeHoldCount: number;
  hasServedNotice: boolean;
  hasServiceRecord: boolean;
  hasLedgerEntries: boolean;
  hasTenancyFacts: boolean;
  notes?: string | null;
  confirmation?: Pick<EligibilityConfirmation, "status"> | null;
  approval?: Pick<FilingApproval, "approval_status" | "attorney_id"> | null;
}

export type GuardResult = { ok: true } | { ok: false; error: string };

const ok: GuardResult = { ok: true };
const fail = (error: string): GuardResult => ({ ok: false, error });

export function isConfirmationActive(c?: Pick<EligibilityConfirmation, "status"> | null): boolean {
  return c?.status === "confirmed";
}

export function isApprovalActive(a?: Pick<FilingApproval, "approval_status"> | null): boolean {
  return a?.approval_status === "approved";
}

/** Pure mirror of confirm_filing_eligibility_v2()'s authorization + precondition checks. */
export function canConfirmEligibility(ctx: FilingReviewContext): GuardResult {
  if (ctx.actorRole === "client") return fail("Only an attorney or administrator may confirm eligibility");
  if (ctx.actorRole === "attorney") {
    if (!ctx.actorAttorneyId) return fail("An active attorney principal is required");
    if (!ctx.isAssigned) return fail("This matter is not assigned to you");
    if (ctx.referralStatus !== "accepted") return fail("The referral must be accepted and active");
  }
  if (!ctx.packetStatus || !["issued", "approved"].includes(ctx.packetStatus)) {
    return fail("A current referral packet version is required");
  }
  if (ctx.blockingRequestCount > 0) return fail("Blocked by an open information request");
  if (ctx.activeHoldCount > 0) return fail("Blocked by an active matter hold");
  if (!ctx.hasServedNotice) return fail("A served notice is required");
  if (!ctx.hasServiceRecord) return fail("A service record is required");
  if (!ctx.hasLedgerEntries) return fail("Ledger entries are required");
  if (!ctx.hasTenancyFacts) return fail("Tenancy facts are incomplete");
  if (!ctx.notes?.trim()) return fail("Confirmation notes are required");
  return ok;
}

/** Pure mirror of approve_filing_readiness()'s checks. */
export function canApproveFiling(ctx: FilingReviewContext): GuardResult {
  if (ctx.actorRole === "client") return fail("Only an attorney or administrator may approve filing");
  if (ctx.actorRole === "attorney" && (!ctx.actorAttorneyId || !ctx.isAssigned)) {
    return fail("This matter is not assigned to you");
  }
  if (!isConfirmationActive(ctx.confirmation)) return fail("An active confirmed eligibility record is required");
  if (ctx.referralStatus && ctx.referralStatus !== "accepted") return fail("The referral must be accepted");
  if (ctx.blockingRequestCount > 0) return fail("Blocked by an open information request");
  if (ctx.activeHoldCount > 0) return fail("Blocked by an active matter hold");
  if (!ctx.packetStatus || !["issued", "approved"].includes(ctx.packetStatus)) {
    return fail("The reviewed referral packet is no longer current");
  }
  return ok;
}

/** Pure mirror of withdraw_filing_approval()'s checks. */
export function canWithdrawApproval(ctx: FilingReviewContext, reason?: string | null): GuardResult {
  if (!isApprovalActive(ctx.approval)) return fail("Only an active approval can be withdrawn");
  if (!reason?.trim()) return fail("A withdrawal reason is required");
  if (ctx.actorRole === "admin") return ok;
  if (ctx.actorRole === "attorney" && ctx.actorAttorneyId && ctx.actorAttorneyId === ctx.approval?.attorney_id) {
    return ok;
  }
  return fail("Only the approving attorney or an administrator may withdraw this approval");
}

export const HARD_CHANGE_KEYS = [
  "ledger_charge_amount_changed",
  "ledger_payment_amount_changed",
  "ledger_credit_amount_changed",
  "ledger_balance_changed",
  "notice_amount_changed",
  "notice_prepared_date_changed",
  "notice_mailed_date_changed",
  "notice_served_date_changed",
  "service_method_changed",
  "tenant_identity_changed",
  "matter_type_changed",
  "occupancy_status_changed",
  "bankruptcy_status_changed",
  "military_status_changed",
  "lease_version_changed",
  "referral_packet_superseded",
] as const;

export const SOFT_CHANGE_KEYS = [
  "supporting_document_added",
  "client_visible_note_added",
  "internal_note_added",
  "contact_phone_corrected",
  "property_contact_updated",
  "typographical_correction",
] as const;

/** Classifies a change key the same way matter_change_rules does; unknown keys are soft. */
export function classifyInvalidation(changeKey: string): "hard" | "soft" {
  return (HARD_CHANGE_KEYS as readonly string[]).includes(changeKey) ? "hard" : "soft";
}

export function changeInvalidatesFilingReview(changeKey: string): boolean {
  return classifyInvalidation(changeKey) === "hard";
}

// ---------- data access ----------

export async function fetchFilingReview(caseId: string) {
  const [confs, apps] = await Promise.all([
    supabase
      .from("filing_eligibility_confirmations")
      .select("*")
      .eq("case_id", caseId)
      .order("version_number", { ascending: false }),
    supabase
      .from("filing_approvals")
      .select("*")
      .eq("case_id", caseId)
      .order("version_number", { ascending: false }),
  ]);
  const confirmations = (confs.data ?? []) as EligibilityConfirmation[];
  const approvals = (apps.data ?? []) as FilingApproval[];
  return {
    confirmations,
    approvals,
    activeConfirmation: confirmations.find((c) => c.status === "confirmed") ?? null,
    activeApproval: approvals.find((a) => a.approval_status === "approved") ?? null,
  };
}

export async function confirmEligibilityV2(args: {
  caseId: string;
  confirmedDate: string;
  notes: string;
  referralId?: string | null;
  referralPacketId?: string | null;
  questionnaireSnapshot?: Record<string, unknown>;
  idempotencyKey?: string | null;
}) {
  const { data, error } = await supabase.rpc("confirm_filing_eligibility_v2", {
    _case_id: args.caseId,
    _confirmed_date: args.confirmedDate,
    _notes: args.notes,
    _referral_id: args.referralId ?? null,
    _referral_packet_id: args.referralPacketId ?? null,
    _questionnaire_snapshot: (args.questionnaireSnapshot ?? {}) as never,
    _idempotency_key: args.idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as unknown as { confirmation: EligibilityConfirmation; replayed: boolean };
}

export async function approveFilingReadiness(caseId: string, notes?: string | null, idempotencyKey?: string | null) {
  const { data, error } = await supabase.rpc("approve_filing_readiness", {
    _case_id: caseId,
    _notes: notes ?? null,
    _idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as unknown as { approval: FilingApproval; replayed: boolean };
}

export async function withdrawFilingApproval(approvalId: string, reason: string) {
  const { data, error } = await supabase.rpc("withdraw_filing_approval", {
    _approval_id: approvalId,
    _reason: reason,
  });
  if (error) throw error;
  return data as unknown as { approval: FilingApproval; replayed: boolean };
}

export async function createBalanceSnapshot(caseId: string, type: BalanceSnapshotType, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase.rpc("create_balance_snapshot", {
    _case_id: caseId,
    _snapshot_type: type,
    _metadata: (metadata ?? {}) as never,
  });
  if (error) throw error;
  return data as unknown as BalanceSnapshot;
}

export function confirmationStatusTone(status: EligibilityConfirmationStatus | FilingApprovalStatus) {
  switch (status) {
    case "confirmed":
    case "approved":
      return "default" as const;
    case "invalidated":
    case "withdrawn":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}