import { supabase } from "@/integrations/supabase/client";

export const NOTICE_KINDS = [
  { value: "five_day_late", label: "5-Day Late Notice" },
  { value: "fourteen_day_demand", label: "14-Day Rent Demand" },
  { value: "notice_to_quit", label: "Notice to Quit" },
  { value: "other", label: "Other Notice" },
] as const;

export type NoticeKind = (typeof NOTICE_KINDS)[number]["value"];

export const NOTICE_KIND_LABELS: Record<string, string> = Object.fromEntries(
  NOTICE_KINDS.map((n) => [n.value, n.label]),
);

export const NOTICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "served", label: "Served" },
  { value: "cure_running", label: "Cure Period Running" },
  { value: "ripe", label: "Expired — Ripe to File" },
  { value: "cured", label: "Cured" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const NOTICE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  NOTICE_STATUSES.map((n) => [n.value, n.label]),
);

export const SERVICE_METHODS = [
  { value: "personal", label: "Personal Delivery" },
  { value: "substituted", label: "Substituted Service" },
  { value: "conspicuous_nail_mail", label: "Conspicuous (Nail & Mail)" },
  { value: "certified_mail", label: "Certified Mail" },
  { value: "other", label: "Other" },
] as const;

/** Merge fields available to notice templates. */
export type NoticeMergeData = Record<string, string>;

const DEFAULT_TEMPLATES: Record<string, string> = {
  five_day_late: `{{landlord}}
{{landlord_address}}

FIVE (5) DAY NOTICE OF LATE RENT

To: {{tenant}}
Premises: {{premises}}
Date: {{prepared_date}}

You are hereby notified that rent for the premises identified above remains unpaid in the amount of {{amount}} as of {{period_through}}.

This notice is provided pursuant to Real Property Law § 235-e(d). If payment is not received, the landlord may serve a written demand for rent and commence a summary proceeding.

{{landlord}}
Landlord / Agent`,
  fourteen_day_demand: `{{landlord}}
{{landlord_address}}

FOURTEEN (14) DAY NOTICE TO PAY RENT OR SURRENDER POSSESSION

To: {{tenant}}
Premises: {{premises}}
Date: {{prepared_date}}

YOU ARE HEREBY REQUIRED to pay the sum of {{amount}}, being rent due for the premises through {{period_through}}, within fourteen (14) days after service of this notice, or to surrender possession of the premises.

If you fail to pay or surrender possession, a summary proceeding to recover possession may be commenced against you pursuant to RPAPL § 711(2).

{{landlord}}
Landlord / Agent`,
  notice_to_quit: `{{landlord}}
{{landlord_address}}

NOTICE TO QUIT

To: {{tenant}}
Premises: {{premises}}
Date: {{prepared_date}}

You are hereby required to quit and surrender possession of the premises identified above.

{{landlord}}
Landlord / Agent`,
  other: `{{landlord}}
{{landlord_address}}

NOTICE

To: {{tenant}}
Premises: {{premises}}
Date: {{prepared_date}}

Amount referenced: {{amount}}

{{landlord}}
Landlord / Agent`,
};

/** Templates are data-driven: stored in system settings, with a built-in fallback. */
export async function loadNoticeTemplates(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value_json")
    .eq("setting_key", "notice_templates")
    .maybeSingle();
  const stored = (data?.setting_value_json as Record<string, string> | null) ?? null;
  return { ...DEFAULT_TEMPLATES, ...(stored || {}) };
}

export function renderTemplate(template: string, data: NoticeMergeData) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => data[key] ?? "");
}

export function currency(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Ledger balance owed as of a date, computed in the database. */
export async function ledgerBalanceAsOf(caseId: string, asOf: string) {
  const { data, error } = await supabase.rpc("ledger_balance_as_of", {
    _case_id: caseId,
    _as_of: asOf,
  });
  if (error) return 0;
  return Number(data ?? 0);
}

/** Builds the merge payload for a notice from the case, property, unit and tenant. */
export function buildMergeData(args: {
  caseRow: any;
  notice: any;
}): NoticeMergeData {
  const { caseRow, notice } = args;
  const client = caseRow?.clients || {};
  const property = caseRow?.properties || {};
  const unit = caseRow?.units || null;
  const tenant = caseRow?.tenants || {};
  const premises = [
    property.address_line1,
    unit?.unit_number ? `Unit ${unit.unit_number}` : null,
    [property.city, property.state, property.zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    landlord: client.company_name || "",
    landlord_address: [client.address_line1, [client.city, client.state, client.zip].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join("\n"),
    tenant: tenant.full_name || "",
    premises,
    unit: unit?.unit_number || "",
    amount: currency(notice.amount_demanded),
    period_through: notice.period_through || "",
    prepared_date: notice.prepared_date || "",
    cure_by_date: notice.cure_by_date || "",
    eligible_to_file_date: notice.eligible_to_file_date || "",
    case_number: caseRow?.case_number || "",
  };
}

export function noticeToHtml(title: string, body: string) {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Georgia,serif;line-height:1.6;max-width:7in;margin:1in auto;white-space:pre-wrap;color:#111}
@media print{body{margin:0.75in}}</style></head><body>${escaped}</body></html>`;
}
