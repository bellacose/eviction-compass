import { describe, it, expect } from "vitest";
import {
  canApproveFiling,
  canConfirmEligibility,
  canWithdrawApproval,
  changeInvalidatesFilingReview,
  classifyInvalidation,
  isApprovalActive,
  isConfirmationActive,
  type FilingReviewContext,
} from "@/lib/eligibility";
import { allowedVisibilities, canReadNote, redactForExport, visibleNoteFilter } from "@/lib/notes";

const ctx = (over: Partial<FilingReviewContext> = {}): FilingReviewContext => ({
  actorRole: "attorney",
  actorAttorneyId: "att-1",
  isAssigned: true,
  referralStatus: "accepted",
  packetStatus: "issued",
  blockingRequestCount: 0,
  activeHoldCount: 0,
  hasServedNotice: true,
  hasServiceRecord: true,
  hasLedgerEntries: true,
  hasTenancyFacts: true,
  notes: "Reviewed the ledger and notice service.",
  confirmation: { status: "confirmed" },
  approval: null,
  ...over,
});

describe("eligibility confirmation guards", () => {
  it("allows an assigned attorney on an accepted referral with a current packet", () => {
    expect(canConfirmEligibility(ctx()).ok).toBe(true);
  });

  it("never lets a client confirm eligibility", () => {
    expect(canConfirmEligibility(ctx({ actorRole: "client" })).ok).toBe(false);
  });

  it("blocks an unassigned attorney", () => {
    expect(canConfirmEligibility(ctx({ isAssigned: false })).ok).toBe(false);
  });

  it("requires a current packet version", () => {
    expect(canConfirmEligibility(ctx({ packetStatus: "superseded" })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ packetStatus: null })).ok).toBe(false);
  });

  it("blocks on open blocking information requests and active holds", () => {
    expect(canConfirmEligibility(ctx({ blockingRequestCount: 1 })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ activeHoldCount: 1 })).ok).toBe(false);
  });

  it("requires the full evidence set and notes", () => {
    expect(canConfirmEligibility(ctx({ hasServedNotice: false })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ hasServiceRecord: false })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ hasLedgerEntries: false })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ hasTenancyFacts: false })).ok).toBe(false);
    expect(canConfirmEligibility(ctx({ notes: "   " })).ok).toBe(false);
  });
});

describe("filing approval guards", () => {
  it("requires an active confirmation", () => {
    expect(canApproveFiling(ctx({ confirmation: { status: "invalidated" } })).ok).toBe(false);
    expect(canApproveFiling(ctx()).ok).toBe(true);
  });

  it("blocks approval while a blocking request or hold is open", () => {
    expect(canApproveFiling(ctx({ blockingRequestCount: 2 })).ok).toBe(false);
    expect(canApproveFiling(ctx({ activeHoldCount: 1 })).ok).toBe(false);
  });

  it("blocks approval when the reviewed packet is stale", () => {
    expect(canApproveFiling(ctx({ packetStatus: "invalidated" })).ok).toBe(false);
  });

  it("reads active status from the record", () => {
    expect(isConfirmationActive({ status: "confirmed" })).toBe(true);
    expect(isConfirmationActive({ status: "withdrawn" })).toBe(false);
    expect(isApprovalActive({ approval_status: "approved" })).toBe(true);
    expect(isApprovalActive({ approval_status: "invalidated" })).toBe(false);
  });
});

describe("approval withdrawal", () => {
  const approved = { approval_status: "approved" as const, attorney_id: "att-1" };

  it("requires a reason", () => {
    expect(canWithdrawApproval(ctx({ approval: approved }), "  ").ok).toBe(false);
  });

  it("lets the approving attorney and any admin withdraw", () => {
    expect(canWithdrawApproval(ctx({ approval: approved }), "Balance changed").ok).toBe(true);
    expect(canWithdrawApproval(ctx({ actorRole: "admin", approval: approved }), "Court stay").ok).toBe(true);
  });

  it("blocks a different attorney", () => {
    expect(canWithdrawApproval(ctx({ actorAttorneyId: "att-9", approval: approved }), "nope").ok).toBe(false);
  });

  it("only an active approval can be withdrawn", () => {
    expect(canWithdrawApproval(ctx({ approval: { approval_status: "withdrawn", attorney_id: "att-1" } }), "x").ok).toBe(false);
  });
});

describe("hard vs soft change invalidation", () => {
  it("classifies ledger, notice, service and identity changes as hard", () => {
    for (const k of ["ledger_balance_changed", "notice_served_date_changed", "service_method_changed", "tenant_identity_changed"]) {
      expect(classifyInvalidation(k)).toBe("hard");
      expect(changeInvalidatesFilingReview(k)).toBe(true);
    }
  });

  it("classifies documents, notes and typos as soft", () => {
    for (const k of ["supporting_document_added", "internal_note_added", "typographical_correction", "unknown_key"]) {
      expect(changeInvalidatesFilingReview(k)).toBe(false);
    }
  });
});

describe("privileged note visibility", () => {
  const notes = [
    { visibility: "attorney_privileged" as const, content: "strategy" },
    { visibility: "client_visible" as const, content: "update" },
    { visibility: "admin_internal" as const, content: "staff" },
  ];

  it("never exposes privileged notes to clients or agencies", () => {
    expect(allowedVisibilities("client")).not.toContain("attorney_privileged");
    expect(allowedVisibilities("agency")).not.toContain("attorney_privileged");
    expect(visibleNoteFilter(notes, { viewer: "client" })).toHaveLength(1);
  });

  it("requires an assigned attorney principal for privileged notes", () => {
    const note = { visibility: "attorney_privileged" as const };
    expect(canReadNote(note, { viewer: "attorney", attorneyId: "att-1", isAssigned: true })).toBe(true);
    expect(canReadNote(note, { viewer: "attorney", attorneyId: "att-1", isAssigned: false })).toBe(false);
    expect(canReadNote(note, { viewer: "attorney", attorneyId: null, isAssigned: true })).toBe(false);
    expect(canReadNote(note, { viewer: "admin" })).toBe(true);
  });

  it("strips privileged notes from exports and packets", () => {
    expect(redactForExport(notes).some((n) => n.visibility === "attorney_privileged")).toBe(false);
  });
});