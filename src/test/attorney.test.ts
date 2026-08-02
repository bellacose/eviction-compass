import { describe, it, expect } from "vitest";
import {
  attorneyCanAccessCase,
  classifyChange,
  changeInvalidatesApproval,
  isActivePrincipal,
  needsActivation,
  isPacketCurrent,
  type AttorneyPrincipal,
  type CaseAssignment,
} from "@/lib/attorney";

const principal = (over: Partial<AttorneyPrincipal> = {}): AttorneyPrincipal => ({
  id: "att-1",
  userId: "user-1",
  status: "active",
  isActive: true,
  firmId: "firm-1",
  firmIds: ["firm-1"],
  isFirmAdmin: false,
  activationRequired: false,
  activationAcknowledgedAt: "2026-08-02T00:00:00Z",
  ...over,
});

const assignment = (over: Partial<CaseAssignment> = {}): CaseAssignment => ({
  caseId: "case-1",
  counselId: "att-2",
  firmId: "firm-1",
  scope: "attorney_only",
  unassignedAt: null,
  ...over,
});

describe("portal activation", () => {
  it("treats a linked but unacknowledged attorney as needing activation", () => {
    const p = principal({ status: "invited", activationRequired: true, activationAcknowledgedAt: null });
    expect(needsActivation(p)).toBe(true);
    expect(isActivePrincipal(p)).toBe(false);
  });

  it("does not activate an attorney with no linked auth user", () => {
    expect(needsActivation(principal({ userId: null, status: "invited" }))).toBe(false);
  });

  it("never treats suspended or deactivated attorneys as activatable principals", () => {
    expect(isActivePrincipal(principal({ status: "suspended" }))).toBe(false);
    expect(isActivePrincipal(principal({ isActive: false }))).toBe(false);
  });
});

describe("assignment scope", () => {
  it("denies firm colleagues when scope is attorney_only", () => {
    expect(attorneyCanAccessCase(principal(), [assignment()], "case-1")).toBe(false);
  });

  it("allows firm colleagues when scope is firm", () => {
    expect(attorneyCanAccessCase(principal(), [assignment({ scope: "firm" })], "case-1")).toBe(true);
  });

  it("allows the named attorney regardless of scope", () => {
    expect(attorneyCanAccessCase(principal(), [assignment({ counselId: "att-1" })], "case-1")).toBe(true);
  });

  it("ignores unassigned rows", () => {
    const a = assignment({ scope: "firm", unassignedAt: "2026-08-01T00:00:00Z" });
    expect(attorneyCanAccessCase(principal(), [a], "case-1")).toBe(false);
  });
});

describe("hard vs soft changes", () => {
  const rules = [
    { change_key: "ledger_amount_changed", change_class: "hard" as const, is_active: true },
    { change_key: "document_added", change_class: "soft" as const, is_active: true },
    { change_key: "retired_rule", change_class: "hard" as const, is_active: false },
  ];

  it("classifies known keys", () => {
    expect(classifyChange(rules, "ledger_amount_changed")).toBe("hard");
    expect(classifyChange(rules, "document_added")).toBe("soft");
  });

  it("defaults unknown and inactive rules to soft", () => {
    expect(classifyChange(rules, "mystery_change")).toBe("soft");
    expect(classifyChange(rules, "retired_rule")).toBe("soft");
  });

  it("only hard changes invalidate approval", () => {
    expect(changeInvalidatesApproval(rules, "ledger_amount_changed")).toBe(true);
    expect(changeInvalidatesApproval(rules, "document_added")).toBe(false);
  });
});

describe("packet versioning", () => {
  it("only issued or approved packets are current", () => {
    expect(isPacketCurrent({ status: "issued" })).toBe(true);
    expect(isPacketCurrent({ status: "approved" })).toBe(true);
    expect(isPacketCurrent({ status: "superseded" })).toBe(false);
    expect(isPacketCurrent({ status: "invalidated" })).toBe(false);
  });
});