import { supabase } from "@/integrations/supabase/client";
import type { ReferralStatus, InformationRequestStatus } from "@/lib/referrals";

export interface QueueRow {
  caseId: string;
  caseNumber: string;
  client: string;
  property: string;
  unit: string | null;
  tenant: string;
  matterType: string | null;
  balance: number;
  matterStatus: string;
  isOnHold: boolean;
  holdReason: string | null;
  referralId: string | null;
  referralStatus: ReferralStatus | null;
  assignedAttorney: string | null;
  packetVersion: number | null;
  blockingItem: string | null;
  nextAction: string | null;
  dueDate: string | null;
  lastMaterialChange: string | null;
  openTaskTypes: string[];
  eligibilityConfirmed: boolean;
  proposedEligibleDate: string | null;
}

export type QueueGroupKey =
  | "new_referrals"
  | "awaiting_acceptance"
  | "needs_information"
  | "ready_for_review"
  | "eligibility_to_confirm"
  | "approved_for_filing"
  | "upcoming_deadlines"
  | "recently_changed";

export const QUEUE_GROUPS: { key: QueueGroupKey; label: string }[] = [
  { key: "new_referrals", label: "New referrals" },
  { key: "awaiting_acceptance", label: "Awaiting acceptance" },
  { key: "needs_information", label: "Needs information" },
  { key: "ready_for_review", label: "Ready for legal review" },
  { key: "eligibility_to_confirm", label: "Eligibility to confirm" },
  { key: "approved_for_filing", label: "Approved for filing" },
  { key: "upcoming_deadlines", label: "Upcoming deadlines" },
  { key: "recently_changed", label: "Recently changed" },
];

const withinDays = (iso: string | null, days: number) => {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return d >= Date.now() - days * 86400000;
};

const dueWithinDays = (iso: string | null, days: number) => {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  return d <= Date.now() + days * 86400000;
};

/**
 * Queue membership is derived from referrals, tasks, holds, matter status and
 * change events — never from case status alone.
 */
export function groupQueue(rows: QueueRow[]): Record<QueueGroupKey, QueueRow[]> {
  const out = Object.fromEntries(QUEUE_GROUPS.map((g) => [g.key, [] as QueueRow[]])) as Record<
    QueueGroupKey,
    QueueRow[]
  >;
  for (const r of rows) {
    if (r.referralStatus === "sent") out.new_referrals.push(r);
    if (r.referralStatus === "pending_acceptance") out.awaiting_acceptance.push(r);
    if (r.referralStatus === "needs_information" || r.blockingItem?.startsWith("Information"))
      out.needs_information.push(r);
    if (r.referralStatus === "accepted" && !r.blockingItem) out.ready_for_review.push(r);
    if (r.referralStatus === "accepted" && !r.eligibilityConfirmed && r.proposedEligibleDate && !r.blockingItem)
      out.eligibility_to_confirm.push(r);
    if (r.eligibilityConfirmed) out.approved_for_filing.push(r);
    if (dueWithinDays(r.dueDate, 7)) out.upcoming_deadlines.push(r);
    if (withinDays(r.lastMaterialChange, 7)) out.recently_changed.push(r);
  }
  return out;
}

export async function loadAttorneyQueue(): Promise<QueueRow[]> {
  // Every query below is RLS-scoped to the signed-in attorney's assignments.
  const { data: cases } = await supabase
    .from("cases")
    .select(
      "id, case_number, status, matter_type, current_balance, is_on_hold, hold_reason, " +
        "proposed_eligible_to_file_date, confirmed_eligible_to_file_date, eligibility_confirmed_at, " +
        "clients(company_name), properties(address_line1, city, state), units(unit_number), tenants:primary_tenant_id(full_name)",
    )
    .order("updated_at", { ascending: false });

  const caseIds = (cases || []).map((c: any) => c.id);
  if (caseIds.length === 0) return [];

  const [refs, tasks, reqs, changes] = await Promise.all([
    supabase
      .from("attorney_referrals")
      .select("id, case_id, status, attorney_id, referral_packet_id, updated_at, counsel:attorney_id(attorney_name), referral_packets:referral_packet_id(version)")
      .in("case_id", caseIds),
    supabase
      .from("tasks")
      .select("id, case_id, task_type, title, due_at, blocking, status")
      .in("case_id", caseIds)
      .in("status", ["open", "in_progress"]),
    supabase
      .from("information_requests")
      .select("id, case_id, status, blocking, category, due_at")
      .in("case_id", caseIds),
    supabase
      .from("matter_change_events")
      .select("case_id, change_class, created_at")
      .in("case_id", caseIds)
      .order("created_at", { ascending: false }),
  ]);

  const refByCase = new Map<string, any>();
  for (const r of refs.data || []) {
    const existing = refByCase.get(r.case_id);
    const active = ["sent", "pending_acceptance", "accepted", "needs_information"].includes(r.status);
    if (!existing || active) refByCase.set(r.case_id, r);
  }
  const changeByCase = new Map<string, string>();
  for (const c of changes.data || []) {
    if (!changeByCase.has(c.case_id) && c.change_class === "hard") changeByCase.set(c.case_id, c.created_at);
  }

  return (cases || []).map((c: any): QueueRow => {
    const ref = refByCase.get(c.id);
    const ctasks = (tasks.data || []).filter((t: any) => t.case_id === c.id);
    const openReq = (reqs.data || []).filter(
      (r: any) =>
        r.case_id === c.id && r.blocking && ["open", "responded", "under_review"].includes(r.status as InformationRequestStatus),
    );
    const blockingTask = ctasks.find((t: any) => t.blocking);
    const nextTask = blockingTask ?? ctasks[0];

    return {
      caseId: c.id,
      caseNumber: c.case_number,
      client: c.clients?.company_name || "—",
      property: c.properties ? `${c.properties.address_line1}, ${c.properties.city}` : "—",
      unit: c.units?.unit_number ?? null,
      tenant: c.tenants?.full_name || "—",
      matterType: c.matter_type,
      balance: Number(c.current_balance || 0),
      matterStatus: c.status,
      isOnHold: !!c.is_on_hold,
      holdReason: c.hold_reason ?? null,
      referralId: ref?.id ?? null,
      referralStatus: (ref?.status as ReferralStatus) ?? null,
      assignedAttorney: ref?.counsel?.attorney_name ?? null,
      packetVersion: ref?.referral_packets?.version ?? null,
      blockingItem: openReq.length
        ? `Information request: ${String(openReq[0].category).replace(/_/g, " ")}`
        : c.is_on_hold
          ? `Hold: ${c.hold_reason || "active"}`
          : blockingTask
            ? `Task: ${blockingTask.title}`
            : null,
      nextAction: nextTask?.title ?? null,
      dueDate: nextTask?.due_at ?? openReq[0]?.due_at ?? null,
      lastMaterialChange: changeByCase.get(c.id) ?? null,
      openTaskTypes: ctasks.map((t: any) => t.task_type),
      eligibilityConfirmed: !!c.confirmed_eligible_to_file_date && !!c.eligibility_confirmed_at,
      proposedEligibleDate: c.proposed_eligible_to_file_date ?? null,
    };
  });
}
