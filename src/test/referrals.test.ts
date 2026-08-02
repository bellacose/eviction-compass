import { describe, it, expect } from "vitest";
import {
  evaluateReferralTransition,
  availableReferralTransitions,
  activeReferral,
  hasActiveReferral,
  isActiveReferral,
  blocksFilingApproval,
  clientSafeReferralStatus,
  ACTIVE_REFERRAL_STATUSES,
  type ReferralTransitionRule,
  type ReferralStatus,
} from "@/lib/referrals";
import { groupQueue, type QueueRow } from "@/lib/attorney-queue";

const rule = (over: Partial<ReferralTransitionRule> = {}): ReferralTransitionRule => ({
  transition_key: "accept_referral",
  from_status: "pending_acceptance",
  to_status: "accepted",
  label: "Accept referral",
  allowed_roles: ["attorney"],
  requires_reason: false,
  requires_named_attorney: true,
  requires_packet: false,
  order_index: 30,
  ...over,
});

const declineRule = rule({
  transition_key: "decline_referral",
  to_status: "declined",
  requires_reason: true,
});

const withdrawRule = rule({
  transition_key: "withdraw_accepted_referral",
  from_status: "accepted",
  to_status: "withdrawn",
  allowed_roles: ["admin"],
  requires_reason: true,
  requires_named_attorney: false,
});

const sendRule = rule({
  transition_key: "send_referral",
  from_status: "draft",
  to_status: "sent",
  allowed_roles: ["admin"],
  requires_named_attorney: false,
  requires_packet: true,
});

describe("referral transition guards", () => {
  it("rejects an unknown transition", () => {
    expect(evaluateReferralTransition(undefined, { status: "sent", actorRole: "admin" }).ok).toBe(false);
  });

  it("rejects a transition from the wrong status", () => {
    const r = evaluateReferralTransition(rule(), { status: "sent", actorRole: "attorney", actorAttorneyId: "a1" });
    expect(r.ok).toBe(false);
  });

  it("rejects a role that is not allowed", () => {
    const r = evaluateReferralTransition(rule(), {
      status: "pending_acceptance", actorRole: "admin",
    });
    expect(r.ok).toBe(false);
  });

  it("requires a named attorney to accept", () => {
    expect(
      evaluateReferralTransition(rule(), { status: "pending_acceptance", actorRole: "attorney", actorAttorneyId: null }).ok,
    ).toBe(false);
  });

  it("blocks a firm colleague from accepting a referral named to another attorney", () => {
    const r = evaluateReferralTransition(rule(), {
      status: "pending_acceptance",
      actorRole: "attorney",
      actorAttorneyId: "att-2",
      referralAttorneyId: "att-1",
    });
    expect(r.ok).toBe(false);
  });

  it("allows a firm member to accept an unnamed firm referral", () => {
    expect(
      evaluateReferralTransition(rule(), {
        status: "pending_acceptance", actorRole: "attorney", actorAttorneyId: "att-2", referralAttorneyId: null,
      }).ok,
    ).toBe(true);
  });

  it("requires a reason to decline", () => {
    const ctx = { status: "pending_acceptance" as ReferralStatus, actorRole: "attorney" as const, actorAttorneyId: "a1" };
    expect(evaluateReferralTransition(declineRule, ctx).ok).toBe(false);
    expect(evaluateReferralTransition(declineRule, { ...ctx, reason: "Conflict of interest" }).ok).toBe(true);
  });

  it("requires a reason to withdraw and admin-only for an accepted referral", () => {
    expect(evaluateReferralTransition(withdrawRule, { status: "accepted", actorRole: "admin" }).ok).toBe(false);
    expect(evaluateReferralTransition(withdrawRule, { status: "accepted", actorRole: "admin", reason: "Client paid" }).ok).toBe(true);
    expect(
      evaluateReferralTransition(withdrawRule, { status: "accepted", actorRole: "attorney", actorAttorneyId: "a1", reason: "x" }).ok,
    ).toBe(false);
  });

  it("requires a packet version before sending", () => {
    expect(evaluateReferralTransition(sendRule, { status: "draft", actorRole: "admin" }).ok).toBe(false);
    expect(
      evaluateReferralTransition(sendRule, { status: "draft", actorRole: "admin", referralPacketId: "pk-1" }).ok,
    ).toBe(true);
  });

  it("only offers transitions the actor may perform", () => {
    const rules = [rule(), declineRule, withdrawRule, sendRule];
    expect(availableReferralTransitions(rules, "pending_acceptance", "admin")).toHaveLength(0);
    expect(availableReferralTransitions(rules, "pending_acceptance", "attorney")).toHaveLength(2);
  });
});

describe("one active referral per matter", () => {
  it("treats only sent, pending, accepted and needs_information as active", () => {
    expect(ACTIVE_REFERRAL_STATUSES).toEqual(["sent", "pending_acceptance", "accepted", "needs_information"]);
    expect(isActiveReferral("declined")).toBe(false);
    expect(isActiveReferral("withdrawn")).toBe(false);
    expect(isActiveReferral("completed")).toBe(false);
    expect(isActiveReferral("draft")).toBe(false);
  });

  it("allows a new referral after a decline and keeps history", () => {
    const history = [{ id: "r1", status: "declined" as ReferralStatus }];
    expect(hasActiveReferral(history)).toBe(false);
    const withNew = [{ id: "r2", status: "sent" as ReferralStatus }, ...history];
    expect(hasActiveReferral(withNew)).toBe(true);
    expect(activeReferral(withNew)?.id).toBe("r2");
    expect(withNew.find((r) => r.id === "r1")).toBeTruthy();
  });
});

describe("blocking information requests", () => {
  it("blocks filing approval while a blocking request is unresolved", () => {
    expect(blocksFilingApproval([{ blocking: true, status: "open" }])).toBe(true);
    expect(blocksFilingApproval([{ blocking: true, status: "responded" }])).toBe(true);
    expect(blocksFilingApproval([{ blocking: true, status: "under_review" }])).toBe(true);
  });

  it("does not block on resolved, withdrawn or non-blocking requests", () => {
    expect(blocksFilingApproval([{ blocking: true, status: "resolved" }])).toBe(false);
    expect(blocksFilingApproval([{ blocking: true, status: "withdrawn" }])).toBe(false);
    expect(blocksFilingApproval([{ blocking: false, status: "open" }])).toBe(false);
  });
});

describe("client-safe labels", () => {
  it("never exposes internal decline wording", () => {
    expect(clientSafeReferralStatus("declined")).toBe("Being reassigned");
    expect(clientSafeReferralStatus("accepted")).toBe("Attorney reviewing");
    expect(clientSafeReferralStatus("needs_information")).toBe("Information requested");
  });
});

const row = (over: Partial<QueueRow> = {}): QueueRow => ({
  caseId: "c1", caseNumber: "M-1", client: "Acme", property: "1 Main", unit: null,
  tenant: "Tenant", matterType: "non_payment", balance: 100, matterStatus: "attorney_review",
  isOnHold: false, holdReason: null, referralId: "r1", referralStatus: "accepted",
  assignedAttorney: "Attorney A", packetVersion: 2, blockingItem: null, nextAction: null,
  dueDate: null, lastMaterialChange: null, openTaskTypes: [], eligibilityConfirmed: false,
  proposedEligibleDate: null, ...over,
});

describe("attorney review queue grouping", () => {
  it("routes referrals into their lifecycle groups", () => {
    const g = groupQueue([
      row({ caseId: "a", referralStatus: "sent" }),
      row({ caseId: "b", referralStatus: "pending_acceptance" }),
      row({ caseId: "c", referralStatus: "needs_information" }),
      row({ caseId: "d", referralStatus: "accepted" }),
    ]);
    expect(g.new_referrals.map((r) => r.caseId)).toEqual(["a"]);
    expect(g.awaiting_acceptance.map((r) => r.caseId)).toEqual(["b"]);
    expect(g.needs_information.map((r) => r.caseId)).toEqual(["c"]);
    expect(g.ready_for_review.map((r) => r.caseId)).toEqual(["d"]);
  });

  it("keeps a blocked matter out of ready-for-review", () => {
    const g = groupQueue([row({ blockingItem: "Information request: ledger" })]);
    expect(g.ready_for_review).toHaveLength(0);
    expect(g.needs_information).toHaveLength(1);
  });

  it("separates eligibility to confirm from approved for filing", () => {
    const g = groupQueue([
      row({ caseId: "e", proposedEligibleDate: "2026-09-01" }),
      row({ caseId: "f", eligibilityConfirmed: true }),
    ]);
    expect(g.eligibility_to_confirm.map((r) => r.caseId)).toEqual(["e"]);
    expect(g.approved_for_filing.map((r) => r.caseId)).toEqual(["f"]);
  });

  it("surfaces upcoming deadlines and recent material changes", () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString();
    const recent = new Date(Date.now() - 86400000).toISOString();
    const g = groupQueue([row({ dueDate: soon, lastMaterialChange: recent })]);
    expect(g.upcoming_deadlines).toHaveLength(1);
    expect(g.recently_changed).toHaveLength(1);
  });
});
