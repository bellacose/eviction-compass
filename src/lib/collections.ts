import { supabase } from "@/integrations/supabase/client";

export interface MatterBalance {
  principal: number;
  court_costs: number;
  legal_fees: number;
  accrued_interest: number;
  payments_total: number;
  write_offs_total: number;
  balance_due: number;
}

export async function fetchMatterBalance(matterId: string): Promise<MatterBalance | null> {
  const { data, error } = await (supabase as any).rpc("collection_matter_balance", { _matter_id: matterId });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    principal: Number(row.principal || 0),
    court_costs: Number(row.court_costs || 0),
    legal_fees: Number(row.legal_fees || 0),
    accrued_interest: Number(row.accrued_interest || 0),
    payments_total: Number(row.payments_total || 0),
    write_offs_total: Number(row.write_offs_total || 0),
    balance_due: Number(row.balance_due || 0),
  };
}

export const STATUS_OPTIONS = [
  "open","in_house","placed_with_agency","judgment_sold","in_enforcement","settled","written_off","paid"
] as const;

export const ORIGIN_OPTIONS = [
  "money_judgment","case_closed_balance","skip_tenant","manual","vendor_debt"
] as const;

export const DEBTOR_TYPES = [
  "tenant","contractor","vendor","process_server","other"
] as const;

export const PRIORITY_OPTIONS = ["low","medium","high","urgent"] as const;

export const CLOSURE_REASONS = [
  "paid_in_full","settled","written_off","uncollectible","bankruptcy",
  "sol_expired","sold","returned_to_client","other"
] as const;

export const PAY_FREQUENCIES = [
  "weekly","biweekly","semimonthly","monthly","other"
] as const;

export const SKIP_TRACE_STATUSES = [
  "not_started","in_progress","located","unable_to_locate","stale"
] as const;

export const BANKRUPTCY_CHAPTERS = ["7","11","13","none"] as const;

export const BANK_ACCOUNT_TYPES = ["checking","savings","business","other"] as const;

export function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function statusColor(s: string) {
  switch (s) {
    case "paid": return "bg-status-success/15 text-status-success";
    case "written_off": return "bg-muted text-muted-foreground";
    case "settled": return "bg-status-success/10 text-status-success";
    case "in_enforcement":
    case "placed_with_agency":
    case "judgment_sold": return "bg-status-warning/15 text-status-warning";
    case "open":
    case "in_house":
    default: return "bg-primary/10 text-primary";
  }
}