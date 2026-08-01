import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MATTER_TYPES, daysDelinquent, formatCurrency } from "@/lib/matter";
import { balancesMatch, matterInfoSchema, validate, type FieldErrors } from "@/lib/intake-validation";
import type { StepProps } from "./types";

export default function StepMatterInfo({ matter, save, next, back }: StepProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    matter_type: "non_payment",
    first_unpaid_month: "",
    last_payment_date: "",
    current_balance: "",
    eviction_reason: "non_payment",
    eviction_reason_other: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!matter) return;
    setForm({
      matter_type: matter.matter_type ?? "non_payment",
      first_unpaid_month: matter.first_unpaid_month ?? "",
      last_payment_date: matter.last_payment_date ?? "",
      current_balance: matter.current_balance != null ? String(matter.current_balance) : "",
      eviction_reason: matter.eviction_reason ?? "non_payment",
      eviction_reason_other: matter.eviction_reason_other ?? "",
    });
  }, [matter?.id]);

  const loadLedger = useCallback(async () => {
    if (!matter?.id) return;
    const { data } = await supabase
      .from("ledger_entries")
      .select("amount, payment_amount, credit_amount")
      .eq("case_id", matter.id);
    if (!data?.length) { setLedgerBalance(null); return; }
    const total = data.reduce(
      (s, r) => s + Number(r.amount ?? 0) - Number(r.payment_amount ?? 0) - Number(r.credit_amount ?? 0),
      0,
    );
    setLedgerBalance(Math.round(total * 100) / 100);
  }, [matter?.id]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  const days = daysDelinquent(form.first_unpaid_month || null);
  const balanceMismatch =
    ledgerBalance != null && !balancesMatch(form.current_balance ? Number(form.current_balance) : 0, ledgerBalance);

  const handleNext = async () => {
    const { ok, errors: errs } = validate(matterInfoSchema, form);
    setErrors(errs);
    if (!ok) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    if (balanceMismatch) {
      toast({
        title: "Balance does not match the rent ledger",
        description: "Use the ledger total or update the ledger before continuing.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    await save({
      matter_type: form.matter_type,
      first_unpaid_month: form.first_unpaid_month || null,
      last_payment_date: form.last_payment_date || null,
      current_balance: form.current_balance ? Number(form.current_balance) : 0,
      eviction_reason: form.eviction_reason,
      eviction_reason_other: form.eviction_reason_other.trim() || null,
    });
    setSaving(false);
    next();
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 6 — Matter Information</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Matter type *</Label>
            <Select value={form.matter_type} onValueChange={(v) => setForm({ ...form, matter_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATTER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Err name="matter_type" />
          </div>
          <div className="space-y-1.5">
            <Label>Current balance owed</Label>
            <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: e.target.value })} />
            <Err name="current_balance" />
          </div>
          <div className="space-y-1.5">
            <Label>First unpaid month</Label>
            <Input type="date" value={form.first_unpaid_month} onChange={(e) => setForm({ ...form, first_unpaid_month: e.target.value })} />
            <Err name="first_unpaid_month" />
          </div>
          <div className="space-y-1.5">
            <Label>Last payment date</Label>
            <Input type="date" value={form.last_payment_date} onChange={(e) => setForm({ ...form, last_payment_date: e.target.value })} />
            <Err name="last_payment_date" />
          </div>
        </div>

        {balanceMismatch && ledgerBalance != null && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <span className="text-destructive">
              Rent ledger total is {formatCurrency(ledgerBalance)} — it must match the balance owed.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setForm({ ...form, current_balance: String(ledgerBalance) })}
            >
              Use ledger total
            </Button>
          </div>
        )}

        {days != null && (
          <p className="text-xs text-muted-foreground">Days delinquent: <span className="font-medium text-foreground">{days}</span></p>
        )}
        <div className="space-y-1.5">
          <Label>Reason detail</Label>
          <Textarea rows={3} value={form.eviction_reason_other} onChange={(e) => setForm({ ...form, eviction_reason_other: e.target.value })} placeholder="Describe the circumstances" />
          <Err name="eviction_reason_other" />
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={handleNext} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
