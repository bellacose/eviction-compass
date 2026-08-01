import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { propertySchema, validate, type FieldErrors } from "@/lib/intake-validation";
import ValidationSummary from "./ValidationSummary";
import type { StepProps } from "./types";

export default function StepProperty({ matter, clientId, save, next, back }: StepProps) {
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    address_line1: "", address_line2: "", city: "Buffalo", state: "NY", zip: "", county: "",
  });

  const load = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("properties").select("*").eq("client_id", clientId).order("address_line1");
    setProperties(data ?? []);
    if (!data?.length) setMode("create");
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const selectExisting = async (id: string) => {
    const p = properties.find((x) => x.id === id);
    await save({
      property_id: id,
      unit_id: null,
      jurisdiction_state: p?.state ?? "NY",
      jurisdiction_county: p?.county || "Erie",
    });
  };

  const createProperty = async () => {
    const { ok, errors: errs } = validate(propertySchema, form);
    setErrors(errs);
    if (!ok) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("properties").insert({
      client_id: clientId,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      zip: form.zip.trim() || null,
      county: form.county.trim() || null,
    }).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Could not create property", description: error?.message, variant: "destructive" });
      return;
    }
    await save({
      property_id: data.id,
      unit_id: null,
      jurisdiction_state: data.state ?? "NY",
      jurisdiction_county: data.county || "Erie",
    });
    await load();
    setMode("select");
    setErrors({});
    toast({ title: "Property added" });
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 2 — Property</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ValidationSummary errors={errors} />
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
            <Label>Property *</Label>
            <Select value={matter?.property_id ?? ""} onValueChange={selectExisting}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address_line1}{p.address_line2 ? ` ${p.address_line2}` : ""}, {p.city} {p.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!properties.length && <p className="text-xs text-muted-foreground">No properties yet — create one.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <AddressAutocomplete
                value={form.address_line1}
                onChange={(v) => setForm((f) => ({ ...f, address_line1: v }))}
                onSelect={(p) => setForm((f) => ({
                  ...f,
                  address_line1: p.address_line1,
                  city: p.city || f.city,
                  state: p.state || f.state,
                  zip: p.zip || f.zip,
                  county: p.county || f.county,
                }))}
              />
              <Err name="address_line1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Address line 2</Label>
                <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
                <Err name="address_line2" />
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Err name="city" />
              </div>
              <div className="space-y-1.5">
                <Label>State *</Label>
                <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                <Err name="state" />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                <Err name="zip" />
              </div>
              <div className="space-y-1.5">
                <Label>County</Label>
                <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
                <Err name="county" />
              </div>
            </div>
            <Button type="button" onClick={createProperty} disabled={saving}>
              {saving ? "Saving…" : "Save property"}
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={next} disabled={!matter?.property_id}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
