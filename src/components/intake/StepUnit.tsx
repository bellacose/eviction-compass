import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { unitSchema, validate, type FieldErrors } from "@/lib/intake-validation";
import type { StepProps } from "./types";

export default function StepUnit({ matter, save, next, back }: StepProps) {
  const { toast } = useToast();
  const [units, setUnits] = useState<any[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    unit_number: "", description: "", bedrooms: "", bathrooms: "", monthly_rent: "",
  });
  const propertyId = matter?.property_id as string | undefined;

  const load = useCallback(async () => {
    if (!propertyId) return;
    const { data } = await supabase
      .from("units").select("*").eq("property_id", propertyId).eq("active", true).order("unit_number");
    setUnits(data ?? []);
    if (!data?.length) setMode("create");
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const createUnit = async () => {
    if (!propertyId) return;
    const { ok, errors: errs } = validate(unitSchema, form);
    setErrors(errs);
    if (!ok) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("units").insert({
      property_id: propertyId,
      unit_number: form.unit_number.trim(),
      description: form.description || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
    }).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Could not create unit", description: error?.message, variant: "destructive" });
      return;
    }
    await save({ unit_id: data.id });
    await load();
    setMode("select");
    setErrors({});
    setForm({ unit_number: "", description: "", bedrooms: "", bathrooms: "", monthly_rent: "" });
    toast({ title: "Unit added" });
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 3 — Unit</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === "select" ? "default" : "outline"} onClick={() => setMode("select")}>
            Select existing
          </Button>
          <Button type="button" size="sm" variant={mode === "create" ? "default" : "outline"} onClick={() => setMode("create")}>
            Create new
          </Button>
        </div>

        {mode === "select" ? (
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={matter?.unit_id ?? ""} onValueChange={(v) => save({ unit_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    Unit {u.unit_number}{u.monthly_rent ? ` — $${u.monthly_rent}/mo` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!units.length && <p className="text-xs text-muted-foreground">No units on this property yet — create one.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit number *</Label>
                <Input value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} placeholder="1A" />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly rent</Label>
                <Input type="number" step="0.01" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bedrooms</Label>
                <Input type="number" step="0.5" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bathrooms</Label>
                <Input type="number" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="button" onClick={createUnit} disabled={saving}>{saving ? "Saving…" : "Save unit"}</Button>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={next}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
