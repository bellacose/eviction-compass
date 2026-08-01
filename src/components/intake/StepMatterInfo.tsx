import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATTER_TYPES, daysDelinquent } from "@/lib/matter";
import type { StepProps } from "./types";

export default function StepMatterInfo({ matter, save, next, back }: StepProps) {
  const [form, setForm] = useState({
    matter_type: "non_payment",
    first_unpaid_month: "",
    last_payment_date: "",
    current_balance: "",
    eviction_reason: "non_payment",
    eviction_reason_other: "",
  });
  const [saving, setSaving] = useState(false);

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

  const days = daysDelinquent(form.first_unpaid_month || null);

  const handleNext = async () => {
    setSaving(true);
    await save({
      matter_type: form.matter_type,
      first_unpaid_month: form.first_unpaid_month || null,
      last_payment_date: form.last_payment_date || null,
      current_balance: form.current_balance ? Number(form.current_balance) : 0,
      eviction_reason: form.eviction_reason,
      eviction_reason_other: form.eviction_reason_other || null,
    });
    setSaving(false);
    next();
  };

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
          </div>
          <div className="space-y-1.5">
            <Label>Current balance owed</Label>
            <Input type="number" step="0.01" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>First unpaid month</Label>
            <Input type="date" value={form.first_unpaid_month} onChange={(e) => setForm({ ...form, first_unpaid_month: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Last payment date</Label>
            <Input type="date" value={form.last_payment_date} onChange={(e) => setForm({ ...form, last_payment_date: e.target.value })} />
          </div>
        </div>
        {days != null && (
          <p className="text-xs text-muted-foreground">Days delinquent: <span className="font-medium text-foreground">{days}</span></p>
        )}
        <div className="space-y-1.5">
          <Label>Reason detail</Label>
          <Textarea rows={3} value={form.eviction_reason_other} onChange={(e) => setForm({ ...form, eviction_reason_other: e.target.value })} placeholder="Describe the circumstances" />
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={handleNext} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
