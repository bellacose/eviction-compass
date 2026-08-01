import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, logMatterEvent } from "@/lib/matter";
import {
  ledgerBalanceIssue,
  ledgerTotals,
  validateLedgerRows,
  type FieldErrors,
} from "@/lib/intake-validation";
import type { StepProps } from "./types";

type Row = {
  id?: string;
  entry_date: string;
  charge_type: string;
  description: string;
  amount: string;
  payment_amount: string;
  credit_amount: string;
};

const blankRow = (): Row => ({
  entry_date: new Date().toISOString().slice(0, 10),
  charge_type: "rent",
  description: "",
  amount: "",
  payment_amount: "",
  credit_amount: "",
});

export default function StepLedger({ matter, save, next, back, onTimelineChange }: StepProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const caseId = matter?.id as string | undefined;

  const load = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabase
      .from("ledger_entries").select("*").eq("case_id", caseId)
      .order("sort_order").order("entry_date");
    setRows(
      (data ?? []).map((r) => ({
        id: r.id,
        entry_date: r.entry_date,
        charge_type: r.charge_type,
        description: r.description ?? "",
        amount: String(r.amount ?? ""),
        payment_amount: String(r.payment_amount ?? ""),
        credit_amount: String(r.credit_amount ?? ""),
      })),
    );
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const num = (v: string) => (v ? Number(v) || 0 : 0);
  const { charges: totalCharges, payments: totalPayments, balance } = ledgerTotals(rows);
  const balanceIssue = ledgerBalanceIssue(rows);

  const update = (i: number, patch: Partial<Row>) => {
    setErrors({});
    setRows(rows.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  };

  const remove = (i: number) => {
    const row = rows[i];
    if (row.id) setDeleted((d) => [...d, row.id!]);
    setErrors({});
    setRows(rows.filter((_, ri) => ri !== i));
  };

  const persist = async () => {
    if (!caseId) return false;
    const rowErrors = validateLedgerRows(rows);
    setErrors(rowErrors);
    if (Object.keys(rowErrors).length) {
      toast({ title: "Fix the highlighted ledger lines", variant: "destructive" });
      return false;
    }
    if (balanceIssue) {
      toast({ title: "Ledger balance invalid", description: balanceIssue, variant: "destructive" });
      return false;
    }
    setSaving(true);
    const added = rows.filter((r) => !r.id).length;
    const updated = rows.filter((r) => r.id).length;
    const removed = deleted.length;
    if (deleted.length) await supabase.from("ledger_entries").delete().in("id", deleted);
    const { data: auth } = await supabase.auth.getUser();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const payload = {
        case_id: caseId,
        entry_date: r.entry_date,
        charge_type: r.charge_type || "rent",
        description: r.description || null,
        amount: num(r.amount),
        payment_amount: num(r.payment_amount),
        credit_amount: num(r.credit_amount),
        sort_order: i,
        created_by: auth.user?.id ?? null,
      };
      if (r.id) await supabase.from("ledger_entries").update(payload).eq("id", r.id);
      else await supabase.from("ledger_entries").insert(payload);
    }
    setDeleted([]);
    await save({ current_balance: balance });
    await logMatterEvent({
      caseId,
      eventKey: "ledger_updated",
      label: "Rent ledger updated",
      detail: `${added} line(s) added, ${updated} kept, ${removed} removed — balance ${formatCurrency(balance)}`,
      metadata: { charges: totalCharges, payments: totalPayments, balance, lines: rows.length },
    });
    onTimelineChange?.();
    await load();
    setSaving(false);
    return true;
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 7 — Rent Ledger</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id ?? i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-6">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input className="h-8" type="date" value={r.entry_date} onChange={(e) => update(i, { entry_date: e.target.value })} />
                <Err name={`${i}.entry_date`} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Input className="h-8" value={r.charge_type} onChange={(e) => update(i, { charge_type: e.target.value })} placeholder="rent" />
                <Err name={`${i}.charge_type`} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input className="h-8" value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Charge</Label>
                <Input className="h-8" type="number" step="0.01" value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} />
                <Err name={`${i}.amount`} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment</Label>
                <Input className="h-8" type="number" step="0.01" value={r.payment_amount} onChange={(e) => update(i, { payment_amount: e.target.value })} />
                <Err name={`${i}.payment_amount`} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Credit</Label>
                <Input className="h-8" type="number" step="0.01" value={r.credit_amount} onChange={(e) => update(i, { credit_amount: e.target.value })} />
                <Err name={`${i}.credit_amount`} />
              </div>
              <div className="flex items-end sm:col-span-5 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, blankRow()])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add line
          </Button>
        </div>

        <div className="rounded-md bg-muted p-3 text-sm grid gap-1 sm:grid-cols-3">
          <div>Charges: <span className="font-medium">{formatCurrency(totalCharges)}</span></div>
          <div>Payments/credits: <span className="font-medium">{formatCurrency(totalPayments)}</span></div>
          <div>Balance: <span className="font-semibold">{formatCurrency(balance)}</span></div>
        </div>

        {balanceIssue && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {balanceIssue}
          </p>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button
            onClick={async () => {
              const ok = await persist();
              if (ok) { toast({ title: "Ledger saved" }); next(); }
            }}
            disabled={saving || !!balanceIssue}
          >
            {saving ? "Saving…" : "Save & continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
