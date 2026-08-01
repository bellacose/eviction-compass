import { supabase } from "@/integrations/supabase/client";

export const MATTER_TYPES = [
  { value: "non_payment", label: "Non-payment" },
  { value: "holdover", label: "Holdover" },
  { value: "lease_violation", label: "Lease Violation" },
  { value: "former_tenant_collection", label: "Former Tenant Collection" },
  { value: "judgment_collection", label: "Judgment Collection" },
  { value: "other", label: "Other" },
] as const;

export const OCCUPANCY_STATUSES = [
  { value: "current_tenant", label: "Current Tenant" },
  { value: "former_tenant", label: "Former Tenant" },
  { value: "evicted", label: "Evicted" },
  { value: "unknown", label: "Unknown" },
] as const;

export const LEASE_TYPES = [
  { value: "written", label: "Written Lease" },
  { value: "oral", label: "Oral Agreement" },
  { value: "month_to_month", label: "Month-to-Month" },
  { value: "expired", label: "Expired / Holdover" },
  { value: "none", label: "No Lease" },
] as const;

export const INTAKE_DOC_CATEGORIES = [
  { value: "lease", label: "Lease" },
  { value: "other", label: "Rental Application" },
  { value: "rent_ledger", label: "Ledger" },
  { value: "correspondence", label: "Communication" },
  { value: "photo", label: "Photos" },
  { value: "court_document", label: "Judgment" },
] as const;

export const MATTER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MATTER_TYPES.map((m) => [m.value, m.label]),
);

export const OCCUPANCY_LABELS: Record<string, string> = Object.fromEntries(
  OCCUPANCY_STATUSES.map((m) => [m.value, m.label]),
);

export const INTAKE_STEPS = [
  "Client",
  "Property",
  "Unit",
  "Tenant",
  "Tenancy",
  "Matter",
  "Ledger",
  "Documents",
  "Legal",
  "Review",
] as const;

export type MatterEventInput = {
  caseId: string;
  eventKey: string;
  label: string;
  detail?: string | null;
  isInternal?: boolean;
  metadata?: Record<string, unknown> | null;
};

/** Appends a chronological event to the matter timeline. Never throws. */
export async function logMatterEvent({
  caseId,
  eventKey,
  label,
  detail = null,
  isInternal = false,
  metadata = null,
}: MatterEventInput) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("matter_events").insert({
    case_id: caseId,
    event_key: eventKey,
    label,
    detail,
    is_internal: isInternal,
    metadata: metadata as never,
    created_by: auth.user?.id ?? null,
  });
  if (error) console.warn("timeline event not recorded:", error.message);
}

export function daysDelinquent(firstUnpaidMonth?: string | null): number | null {
  if (!firstUnpaidMonth) return null;
  const start = new Date(firstUnpaidMonth);
  if (Number.isNaN(start.getTime())) return null;
  const diff = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

type StageInput = {
  status?: string | null;
  matter_type?: string | null;
  submitted_at?: string | null;
  intake_step?: number | null;
};

export function currentStage(row: StageInput): string {
  if (row.status === "draft") return "Draft Intake";
  if (row.status === "attorney_review") return "Attorney Review";
  return row.status ? row.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

export function nextRequiredAction(row: StageInput): string {
  switch (row.status) {
    case "draft":
      return `Complete intake${row.intake_step ? ` (step ${row.intake_step} of 10)` : ""}`;
    case "attorney_review":
      return "Attorney to accept matter";
    case "intake":
      return "Assign attorney and prepare notice";
    case "notice_preparation":
      return "Prepare and serve notice";
    case "notice_served":
      return "Wait out statutory period";
    case "ready_to_file":
      return "File petition with court";
    case "filed":
      return "Await court date";
    case "court_scheduled":
    case "in_court_process":
      return "Attend hearing";
    case "outcome_pending":
      return "Record judgment / outcome";
    case "resolved":
      return "Confirm balance and close";
    case "closed":
      return "None";
    case "on_hold":
      return "Resolve hold";
    default:
      return "Review matter";
  }
}

/** Field-level provenance used by the rental application sections. */
export type VerifiedField = {
  value: string;
  source?: string;
  verified?: boolean;
  verification_date?: string | null;
};

export const emptyVerifiedField = (): VerifiedField => ({
  value: "",
  source: "",
  verified: false,
  verification_date: null,
});

export function readField(section: unknown, key: string): VerifiedField {
  const obj = (section ?? {}) as Record<string, unknown>;
  const raw = obj[key];
  if (raw && typeof raw === "object") {
    const f = raw as Partial<VerifiedField>;
    return {
      value: f.value ?? "",
      source: f.source ?? "",
      verified: f.verified ?? false,
      verification_date: f.verification_date ?? null,
    };
  }
  return emptyVerifiedField();
}
