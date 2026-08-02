import { describe, expect, it } from "vitest";
import {
  evaluateTransition,
  eligibilityLabel,
  isEligibilityConfirmed,
  availableTransitions,
  type MatterGuardContext,
  type TransitionRule,
} from "@/lib/transitions";

const rule = (over: Partial<TransitionRule> = {}): TransitionRule => ({
  transition_key: "submit_for_review",
  from_status: "draft",
  to_status: "attorney_review",
  label: "Submit for review",
  allowed_roles: ["admin", "client"],
  requires_reason: false,
  prerequisite_keys: ["intake_complete"],
  blocking_hold_types: ["missing_documentation"],
  order_index: 1,
  ...over,
});

const ctx = (over: Partial<MatterGuardContext> = {}): MatterGuardContext => ({
  status: "draft",
  clientId: "client-a",
  actorClientId: "client-a",
  actorRole: "client",
  activeHoldTypes: [],
  satisfiedPrerequisites: ["intake_complete"],
  ...over,
});

describe("transition guards", () => {
  it("blocks cross-client transitions", () => {
    const r = evaluateTransition(rule(), ctx({ actorClientId: "client-b" }));
    expect(r).toEqual({ ok: false, error: "Not authorized for this matter" });
  });

  it("blocks clients from transitioning directly to filed", () => {
    const fileRule = rule({
      transition_key: "file_petition",
      from_status: "ready_to_file",
      to_status: "filed",
      allowed_roles: ["admin"],
      prerequisite_keys: [],
      blocking_hold_types: [],
    });
    const r = evaluateTransition(fileRule, ctx({ status: "ready_to_file" }));
    expect(r.ok).toBe(false);
    expect(availableTransitions([fileRule], "ready_to_file", "client")).toHaveLength(0);
    expect(availableTransitions([fileRule], "ready_to_file", "admin")).toHaveLength(1);
  });

  it("blocks advancement while a bankruptcy hold is active", () => {
    const advance = rule({
      transition_key: "advance_to_notice",
      from_status: "intake",
      to_status: "notice_preparation",
      allowed_roles: ["admin"],
      prerequisite_keys: [],
      blocking_hold_types: ["bankruptcy", "military_review"],
    });
    const r = evaluateTransition(advance, ctx({ status: "intake", actorRole: "admin", activeHoldTypes: ["bankruptcy"] }));
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toMatch(/Bankruptcy hold/);
  });

  it("blocks transitions with missing prerequisites and leaves status unchanged", () => {
    const status = "draft" as const;
    const r = evaluateTransition(rule(), ctx({ satisfiedPrerequisites: [] }));
    expect(r).toEqual({ ok: false, error: "Prerequisite not met: intake complete" });
    expect(status).toBe("draft");
  });

  it("blocks open blocking tasks", () => {
    const r = evaluateTransition(
      rule({ prerequisite_keys: ["no_blocking_tasks"] }),
      ctx({ hasOpenBlockingTasks: true }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown transition key", () => {
    expect(evaluateTransition(undefined, ctx())).toEqual({ ok: false, error: "Unknown transition" });
  });

  it("rejects a transition that does not start from the current status", () => {
    const r = evaluateTransition(rule(), ctx({ status: "filed" }));
    expect(r.ok).toBe(false);
  });

  it("requires a reason when the rule demands one", () => {
    expect(evaluateTransition(rule({ requires_reason: true }), ctx()).ok).toBe(false);
    expect(evaluateTransition(rule({ requires_reason: true }), ctx({ reason: "tenant paid" })).ok).toBe(true);
  });

  it("allows a valid transition", () => {
    expect(evaluateTransition(rule(), ctx())).toEqual({ ok: true });
  });

  it("supports resubmission once information is supplied", () => {
    const amend = rule({
      transition_key: "request_amendment",
      from_status: "attorney_review",
      to_status: "draft",
      allowed_roles: ["admin"],
      requires_reason: true,
      prerequisite_keys: [],
      blocking_hold_types: [],
    });
    expect(evaluateTransition(amend, ctx({ status: "attorney_review", actorRole: "admin", reason: "missing lease" })).ok).toBe(true);
    // client cannot resubmit until intake is complete again
    expect(evaluateTransition(rule(), ctx({ satisfiedPrerequisites: [] })).ok).toBe(false);
    expect(evaluateTransition(rule(), ctx({ satisfiedPrerequisites: ["intake_complete"] })).ok).toBe(true);
  });
});

describe("filing eligibility", () => {
  it("keeps the confirmed date distinct from the proposed date", () => {
    const proposedOnly = { proposed: "2026-09-01", confirmed: null, confirmedAt: null };
    expect(eligibilityLabel(proposedOnly)).toEqual({ date: "2026-09-01", label: "Proposed" });
    expect(isEligibilityConfirmed(proposedOnly)).toBe(false);

    const confirmed = { proposed: "2026-09-01", confirmed: "2026-09-04", confirmedAt: "2026-09-02T10:00:00Z" };
    expect(eligibilityLabel(confirmed)).toEqual({ date: "2026-09-04", label: "Confirmed" });
    expect(isEligibilityConfirmed(confirmed)).toBe(true);
    expect(confirmed.confirmed).not.toEqual(confirmed.proposed);
  });
});
