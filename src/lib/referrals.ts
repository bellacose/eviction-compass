import { supabase } from "@/integrations/supabase/client";

export type ReferralStatus =
  | "draft"
  | "sent"
  | "pending_acceptance"
  | "accepted"
  | "declined"
  | "needs_information"
  | "withdrawn"
  | "completed";

export type InformationRequestStatus =
  | "open"
  | "responded"
  | "under_review"
  | "resolved"
  | "withdrawn";

export type ReferralActorRole = "admin" | "attorney";

/** Statuses that occupy the single active-referral slot on a matter. */
export const ACTIVE_REFERRAL_STATUSES: ReferralStatus[] = [
  "sent",
  "pending_acceptance",
  "accepted",
  "needs_information",
];

export const INFORMATION_REQUEST_CATEGORIES = [
  "lease",
  "ledger",
  "notice",
  "service",
  "tenancy",
  "tenant_identity",
  "bankruptcy",
  "military_status",
  "payment",
  "court_document",
  "other",
] as const;

export type InformationRequestCategory = (typeof INFORMATION_REQUEST_CATEGORIES)[number];

export interface ReferralTransitionRule {
  transition_key: string;
  from_status: ReferralStatus;
  to_status: ReferralStatus;
  label: string;
  allowed_roles: string[];
  requires_reason: boolean;
  requires_named_attorney: boolean;
  requires_packet: boolean;
  order_index: number;
}

export interface Referral {
  id: string;
  case_id: string;
  attorney_id: string | null;
  firm_id: string | null;
  referral_packet_id: string | null;
  status: ReferralStatus;
  decline_reason: string | null;
  withdrawal_reason: string | null;
  client_visible_status: string | null;
  fee_arrangement: string | null;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isActiveReferral(status: ReferralStatus): boolean {
  return ACTIVE_REFERRAL_STATUSES.includes(status);
}

/** A matter may hold only one active referral; history stays queryable. */
export function hasActiveReferral(referrals: { status: ReferralStatus }[]): boolean {
  return referrals.some((r) => isActiveReferral(r.status));
}

export function activeReferral<T extends { status: ReferralStatus }>(referrals: T[]): T | null {
  return referrals.find((r) => isActiveReferral(r.status)) ?? null;
}

export interface ReferralGuardContext {
  status: ReferralStatus;
  actorRole: ReferralActorRole;
  /** counsel id of the signed-in attorney, when there is one */
  actorAttorneyId?: string | null;
  referralAttorneyId?: string | null;
  referralPacketId?: string | null;
  reason?: string | null;
}

export type GuardResult = { ok: true } | { ok: false; error: string };

/**
 * Pure mirror of transition_attorney_referral(). The database stays
 * authoritative; this drives the UI and the test suite.
 */
export function evaluateReferralTransition(
  rule: ReferralTransitionRule | undefined,
  ctx: ReferralGuardContext,
): GuardResult {
  if (!rule) return { ok: false, error: "Unknown referral transition" };
  if (rule.from_status !== ctx.status) {
    return { ok: false, error: `Transition ${rule.transition_key} is not allowed from status ${ctx.status}` };
  }
  if (!rule.allowed_roles.includes(ctx.actorRole)) {
    return { ok: false, error: `Role ${ctx.actorRole} may not perform ${rule.transition_key}` };
  }
  if (rule.requires_reason && !ctx.reason?.trim()) {
    return { ok: false, error: "A reason is required" };
  }
  if (rule.requires_packet && !ctx.referralPacketId) {
    return { ok: false, error: "A referral packet version is required before sending" };
  }
  if (rule.requires_named_attorney) {
    if (ctx.actorRole !== "attorney" || !ctx.actorAttorneyId) {
      return { ok: false, error: "Only the named attorney may perform this action" };
    }
    if (ctx.referralAttorneyId && ctx.referralAttorneyId !== ctx.actorAttorneyId) {
      return { ok: false, error: "This referral is directed to another attorney" };
    }
  }
  return { ok: true };
}

export function availableReferralTransitions(
  rules: ReferralTransitionRule[],
  status: ReferralStatus,
  role: ReferralActorRole,
): ReferralTransitionRule[] {
  return rules
    .filter((r) => r.from_status === status && r.allowed_roles.includes(role))
    .sort((a, b) => a.order_index - b.order_index);
}

/** Client-facing label; never leaks internal decline detail or fee terms. */
export function clientSafeReferralStatus(status: ReferralStatus): string {
  switch (status) {
    case "draft":
      return "Preparing attorney referral";
    case "sent":
      return "Referred to attorney";
    case "pending_acceptance":
      return "Awaiting attorney acceptance";
    case "accepted":
      return "Attorney reviewing";
    case "needs_information":
      return "Information requested";
    case "declined":
      return "Being reassigned";
    case "withdrawn":
      return "Referral withdrawn";
    case "completed":
      return "Attorney review complete";
  }
}

export function referralStatusTone(
  status: ReferralStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "accepted":
    case "completed":
      return "default";
    case "sent":
    case "pending_acceptance":
      return "secondary";
    case "declined":
    case "needs_information":
      return "destructive";
    default:
      return "outline";
  }
}

/** Blocking requests hold up filing approval until resolved or withdrawn. */
export function blocksFilingApproval(
  requests: { blocking: boolean; status: InformationRequestStatus }[],
): boolean {
  return requests.some(
    (r) => r.blocking && ["open", "responded", "under_review"].includes(r.status),
  );
}

export function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------- data access

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function fetchReferralRules(): Promise<ReferralTransitionRule[]> {
  const { data, error } = await supabase
    .from("attorney_referral_transition_rules")
    .select(
      "transition_key, from_status, to_status, label, allowed_roles, requires_reason, requires_named_attorney, requires_packet, order_index",
    )
    .eq("is_active", true)
    .order("order_index");
  if (error) throw new Error(error.message);
  return (data ?? []) as ReferralTransitionRule[];
}

export async function fetchReferrals(caseId: string) {
  const { data, error } = await supabase
    .from("attorney_referrals")
    .select(
      "*, counsel:attorney_id(attorney_name, firm_name), firms:firm_id(name), referral_packets:referral_packet_id(version, status)",
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function fetchReferralHistory(referralId: string) {
  const { data } = await supabase
    .from("attorney_referral_transitions")
    .select("*")
    .eq("referral_id", referralId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createReferral(input: {
  caseId: string;
  attorneyId?: string | null;
  firmId?: string | null;
  packetId?: string | null;
  feeArrangement?: string | null;
  idempotencyKey?: string | null;
}) {
  const { data, error } = await rpc("create_attorney_referral", {
    _case_id: input.caseId,
    _attorney_id: input.attorneyId ?? null,
    _firm_id: input.firmId ?? null,
    _referral_packet_id: input.packetId ?? null,
    _fee_arrangement: input.feeArrangement ?? null,
    _idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function transitionReferral(
  referralId: string,
  transitionKey: string,
  reason?: string | null,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string | null,
) {
  const { data, error } = await rpc("transition_attorney_referral", {
    _referral_id: referralId,
    _transition_key: transitionKey,
    _reason: reason ?? null,
    _metadata: metadata ?? {},
    _idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function attachRevisedPacket(referralId: string, packetId: string, notes?: string | null) {
  const { data, error } = await rpc("attach_revised_packet", {
    _referral_id: referralId,
    _packet_id: packetId,
    _notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as any;
}

// ------------------------------------------------------- information requests

export async function fetchInformationRequests(caseId: string) {
  const { data, error } = await supabase
    .from("information_requests")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function fetchRequestResponses(requestId: string) {
  const { data } = await supabase
    .from("information_request_responses")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createInformationRequest(input: {
  caseId: string;
  category: InformationRequestCategory;
  description: string;
  blocking?: boolean;
  referralId?: string | null;
  assignedUserId?: string | null;
  assignedRole?: string | null;
  dueAt?: string | null;
  relatedRecordType?: string | null;
  relatedRecordId?: string | null;
  idempotencyKey?: string | null;
}) {
  const { data, error } = await rpc("create_information_request", {
    _case_id: input.caseId,
    _category: input.category,
    _description: input.description,
    _blocking: input.blocking ?? true,
    _referral_id: input.referralId ?? null,
    _assigned_user_id: input.assignedUserId ?? null,
    _assigned_role: input.assignedRole ?? "client",
    _due_at: input.dueAt ?? null,
    _related_record_type: input.relatedRecordType ?? null,
    _related_record_id: input.relatedRecordId ?? null,
    _idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function respondToInformationRequest(
  requestId: string,
  responseText: string,
  documentIds: string[] = [],
  idempotencyKey?: string | null,
) {
  const { data, error } = await rpc("respond_to_information_request", {
    _request_id: requestId,
    _response_text: responseText,
    _document_ids: documentIds,
    _idempotency_key: idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function reviewInformationRequest(requestId: string, note?: string | null) {
  const { error } = await rpc("review_information_request", { _request_id: requestId, _note: note ?? null });
  if (error) throw new Error(error.message);
}

export async function resolveInformationRequest(
  requestId: string,
  resolutionNotes: string,
  reopen = false,
) {
  const { error } = await rpc("resolve_information_request", {
    _request_id: requestId,
    _resolution_notes: resolutionNotes,
    _reopen: reopen,
  });
  if (error) throw new Error(error.message);
}

export async function withdrawInformationRequest(requestId: string, reason: string) {
  const { error } = await rpc("withdraw_information_request", { _request_id: requestId, _reason: reason });
  if (error) throw new Error(error.message);
}
