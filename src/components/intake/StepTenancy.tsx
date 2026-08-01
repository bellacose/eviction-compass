import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LEASE_TYPES, OCCUPANCY_STATUSES } from "@/lib/matter";
import { tenancySchema, validate, type FieldErrors } from "@/lib/intake-validation";
import type { StepProps } from "./types";

export default function StepTenancy({ matter, clientId, save, next, back }: StepProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    lease_start: "", lease_end: "", lease_type: "written",
    monthly_rent: "", security_deposit: "", occupancy_status: "current_tenant", notes: "",
  });

  const load = useCallback(async () => {
    if (!matter?.tenancy_id) return;
    const { data } = await supabase.from("tenancies").select("*").eq("id", matter.tenancy_id).maybeSingle();
    if (data) {
      setForm({
        lease_start: data.lease_start ?? "",
        lease_end: data.lease_end ?? "",
        lease_type: data.lease_type ?? "written",
        monthly_rent: data.monthly_rent != null ? String(data.monthly_rent) : "",
        security_deposit: data.security_deposit != null ? String(data.security_deposit) : "",
        occupancy_status: data.occupancy_status ?? "current_tenant",
        notes: data.notes ?? "",
      });
    }
  }, [matter?.tenancy_id]);

  useEffect(() => { load(); }, [load]);

  const saveTenancy = async () => {
    if (!matter?.property_id || !matter?.primary_tenant_id) {
      toast({ title: "Property and tenant are required first", variant: "destructive" });
      return;
    }
    const { ok, errors: errs } = validate(tenancySchema, form);
    setErrors(errs);
    if (!ok) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      client_id: clientId,
      property_id: matter.property_id,
      unit_id: matter.unit_id ?? null,
      tenant_id: matter.primary_tenant_id,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      lease_type: form.lease_type,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      security_deposit: form.security_deposit ? Number(form.security_deposit) : null,
      occupancy_status: form.occupancy_status as never,
      notes: form.notes.trim() || null,
    };
    let tenancyId = matter.tenancy_id as string | null;
    if (tenancyId) {
      const { error } = await supabase.from("tenancies").update(payload).eq("id", tenancyId);
      if (error) { setSaving(false); toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("tenancies").insert(payload).select().single();
      if (error || !data) { setSaving(false); toast({ title: "Save failed", description: error?.message, variant: "destructive" }); return; }
      tenancyId = data.id;
      await save({ tenancy_id: tenancyId });
    }
    setSaving(false);
    setErrors({});
    toast({ title: "Tenancy saved" });
    next();
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 5 — Tenancy</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Lease type</Label>
            <Select value={form.lease_type} onValueChange={(v) => setForm({ ...form, lease_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEASE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Occupancy status</Label>
            <Select value={form.occupancy_status} onValueChange={(v) => setForm({ ...form, occupancy_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCCUPANCY_STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lease start</Label>
            <Input type="date" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} />
            <Err name="lease_start" />
          </div>
          <div className="space-y-1.5">
            <Label>Lease end</Label>
            <Input type="date" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} />
            <Err name="lease_end" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly rent *</Label>
            <Input type="number" step="0.01" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} />
            <Err name="monthly_rent" />
          </div>
          <div className="space-y-1.5">
            <Label>Security deposit</Label>
            <Input type="number" step="0.01" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} />
            <Err name="security_deposit" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          <Err name="notes" />
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={saveTenancy} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
