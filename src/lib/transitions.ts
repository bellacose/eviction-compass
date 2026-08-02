import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CaseStatus = Database["public"]["Enums"]["case_status"];
export type MatterHoldType = Database["public"]["Enums"]["matter_hold_type"];
export type ActorRole = "admin" | "client";

export const HOLD_TYPES: { value: MatterHoldType; label: string }[] = [
  { value: "bankruptcy", label: "Bankruptcy" },
  { value: "military_review", label: "Military / SCRA review" },
  { value: "payment_plan", label: "Payment plan" },
  { value: "attorney_review", label: "Attorney review" },
  { value: "missing_documentation", label: "Missing documentation" },
  { value: "tenant_dispute", label: "Tenant dispute" },
  { value: "court_stay", label: "Court stay" },
  { value: "compliance_review", label: "Compliance review" },
  { value: "administrative", label: "Administrative" },
];

export const HOLD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  HOLD_TYPES.map((h) => [h.value, h.label]),
);

export type TransitionRule = {
  transition_key: string;
  from_status: CaseStatus;
  to_status: CaseStatus;
  label: string;
  allowed_roles: string[];
  requires_reason: boolean;
  prerequisite_keys: string[];
  blocking_hold_types: MatterHoldType[];
  order_index: number;
};

export type MatterGuardContext = {
  status: CaseStatus;
  /** client_id of the matter */
  clientId: string | null;
  /** client_id of the actor (null for admins) */
  actorClientId: string | null;
  actorRole: ActorRole;
  reason?: string | null;
  activeHoldTypes: MatterHoldType[];
  /** satisfied prerequisite keys, e.g. intake_complete, eligibility_confirmed */
  satisfiedPrerequisites: string[];
  hasOpenBlockingTasks?: boolean;
};

export type GuardResult = { ok: true } | { ok: false; error: string };

/**
 * Pure mirror of the server-side checks inside transition_matter().
 * The database remains the authority - this powers the UI and the test suite.
 */
export function evaluateTransition(rule: TransitionRule | undefined, ctx: MatterGuardContext): GuardResult {
  if (!rule) return { ok: false, error: "Unknown transition" };

  if (ctx.actorRole !== "admin") {
    if (!ctx.actorClientId || ctx.actorClientId !== ctx.clientId) {
      return { ok: false, error: "Not authorized for this matter" };
    }
  }

  if (rule.from_status !== ctx.status) {
    return { ok: false, error: `Transition ${rule.transition_key} is not allowed from status ${ctx.status}` };
  }

  if (!rule.allowed_roles.includes(ctx.actorRole)) {
    return { ok: false, error: `Role ${ctx.actorRole} may not perform ${rule.transition_key}` };
  }

  if (rule.requires_reason && !ctx.reason?.trim()) {
    return { ok: false, error: "A reason is required" };
  }

  const blocking = rule.blocking_hold_types.find((h) => ctx.activeHoldTypes.includes(h));
  if (blocking) return { ok: false, error: `Blocked by an active ${HOLD_TYPE_LABELS[blocking] ?? blocking} hold` };

  const missing = rule.prerequisite_keys.find((p) => p !== "no_blocking_tasks" && !ctx.satisfiedPrerequisites.includes(p));
  if (missing) return { ok: false, error: `Prerequisite not met: ${missing.replace(/_/g, " ")}` };

  if (rule.prerequisite_keys.includes("no_blocking_tasks") && ctx.hasOpenBlockingTasks) {
    return { ok: false, error: "Prerequisite not met: blocking tasks remain open" };
  }

  return { ok: true };
}

/** Filing eligibility is proposed until an authorized actor confirms it. */
export type EligibilityState = {
  proposed: string | null;
  confirmed: string | null;
  confirmedAt: string | null;
};

export function eligibilityLabel(e: EligibilityState): { date: string | null; label: "Proposed" | "Confirmed" | null } {
  if (e.confirmed && e.confirmedAt) return { date: e.confirmed, label: "Confirmed" };
  if (e.proposed) return { date: e.proposed, label: "Proposed" };
  return { date: null, label: null };
}

export function isEligibilityConfirmed(e: EligibilityState): boolean {
  return !!(e.confirmed && e.confirmedAt);
}

// ---------------------------------------------------------------- data access

export async function fetchTransitionRules(): Promise<TransitionRule[]> {
  const { data, error } = await supabase
    .from("matter_transition_rules")
    .select("transition_key, from_status, to_status, label, allowed_roles, requires_reason, prerequisite_keys, blocking_hold_types, order_index")
    .eq("is_active", true)
    .order("order_index");
  if (error) throw new Error(error.message);
  return (data ?? []) as TransitionRule[];
}

export function availableTransitions(rules: TransitionRule[], status: CaseStatus, role: ActorRole): TransitionRule[] {
  return rules.filter((r) => r.from_status === status && r.allowed_roles.includes(role));
}

export type TransitionResponse = {
  matter: Record<string, unknown>;
  next_actions: { transition_key: string; label: string; to_status: CaseStatus }[];
};

export async function transitionMatter(
  caseId: string,
  transitionKey: string,
  reason?: string | null,
  metadata?: Record<string, unknown>,
): Promise<TransitionResponse> {
  const { data, error } = await supabase.rpc("transition_matter", {
    _case_id: caseId,
    _transition_key: transitionKey,
    _reason: reason ?? null,
    _metadata: (metadata ?? {}) as never,
  });
  if (error) throw new Error(error.message);
  return data as unknown as TransitionResponse;
}

export async function openHold(input: {
  caseId: string;
  holdType: MatterHoldType;
  reason: string;
  ownerUserId?: string | null;
  reviewDate?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("open_matter_hold", {
    _case_id: input.caseId,
    _hold_type: input.holdType,
    _reason: input.reason,
    _owner_user_id: input.ownerUserId ?? null,
    _review_date: input.reviewDate ?? null,
  });
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

export async function releaseHold(holdId: string, releaseReason: string): Promise<void> {
  const { error } = await supabase.rpc("release_matter_hold", {
    _hold_id: holdId,
    _release_reason: releaseReason,
  });
  if (error) throw new Error(error.message);
}

export async function confirmEligibility(caseId: string, confirmedDate: string, notes?: string | null): Promise<void> {
  const { error } = await supabase.rpc("confirm_filing_eligibility", {
    _case_id: caseId,
    _confirmed_date: confirmedDate,
    _notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function completeTask(taskId: string, note?: string | null): Promise<void> {
  const { error } = await supabase.rpc("complete_task", { _task_id: taskId, _note: note ?? null });
  if (error) throw new Error(error.message);
}

export async function fetchActiveHolds(caseId: string) {
  const { data } = await supabase
    .from("matter_holds")
    .select("*")
    .eq("case_id", caseId)
    .is("released_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchOpenTasks(caseId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("case_id", caseId)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: true });
  return data ?? [];
}
