import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { emptyVerifiedField, type VerifiedField } from "@/lib/matter";
import VerifiedFieldInput from "./VerifiedFieldInput";
import { tenantSchema, validate, type FieldErrors } from "@/lib/intake-validation";
import ValidationSummary from "./ValidationSummary";
import type { StepProps } from "./types";

type Section = Record<string, VerifiedField>;

const IDENTITY_FIELDS = [
  ["date_of_birth", "Date of Birth", "date"],
  ["ssn_last4", "Last 4 SSN", "text"],
  ["phone", "Phone", "tel"],
  ["email", "Email", "email"],
] as const;

const EMPLOYMENT_FIELDS = [
  ["employer", "Employer", "text"],
  ["employer_phone", "Employer Phone", "tel"],
  ["employer_address", "Employer Address", "text"],
  ["position", "Position", "text"],
  ["monthly_income", "Monthly Income", "number"],
] as const;

const BANK_FIELDS = [
  ["bank_name", "Bank Name", "text"],
  ["account_type", "Account Type", "text"],
  ["account_last4", "Account Last 4", "text"],
] as const;

const PREVIOUS_ADDRESS_FIELDS = [
  ["address", "Previous Address", "text"],
  ["city", "City", "text"],
  ["state", "State", "text"],
  ["zip", "ZIP", "text"],
  ["prior_landlord", "Prior Landlord", "text"],
  ["prior_landlord_phone", "Prior Landlord Phone", "tel"],
] as const;

const LICENSE_FIELDS = [
  ["number", "Driver License Number", "text"],
  ["state", "Issuing State", "text"],
  ["expiration", "Expiration", "date"],
] as const;

const emptyRow = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, ""]));

export default function StepTenant({ matter, clientId, save, next, back }: StepProps) {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<any[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [basics, setBasics] = useState({ first_name: "", last_name: "", phone: "", email: "", mailing_address: "" });
  const [identity, setIdentity] = useState<Section>({});
  const [employment, setEmployment] = useState<Section>({});
  const [bank, setBank] = useState<Section>({});
  const [prevAddress, setPrevAddress] = useState<Section>({});
  const [license, setLicense] = useState<Section>({});
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [references, setReferences] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!clientId) return;
    const [{ data: tenancyRows }, { data: caseRows }] = await Promise.all([
      supabase.from("tenancies").select("tenant_id").eq("client_id", clientId),
      supabase.from("cases").select("primary_tenant_id").eq("client_id", clientId),
    ]);
    const ids = Array.from(
      new Set([
        ...(tenancyRows ?? []).map((t) => t.tenant_id),
        ...(caseRows ?? []).map((c) => c.primary_tenant_id),
      ].filter(Boolean) as string[]),
    );
    if (!ids.length) {
      setTenants([]);
      setMode("create");
      return;
    }
    const { data } = await supabase.from("tenants").select("*").in("id", ids).order("full_name");
    setTenants(data ?? []);
    if (!data?.length) setMode("create");
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const sectionValue = (section: Section, keys: readonly (readonly [string, string, string])[]) => {
    const out: Record<string, VerifiedField> = {};
    keys.forEach(([key]) => {
      const f = section[key];
      if (f && f.value) out[key] = f;
    });
    return out;
  };

  const getField = (section: Section, key: string) => section[key] ?? emptyVerifiedField();

  const createTenant = async () => {
    const candidate = {
      ...basics,
      ssn_last4: getField(identity, "ssn_last4").value,
      date_of_birth: getField(identity, "date_of_birth").value,
    };
    const { ok, errors: errs } = validate(tenantSchema, candidate);
    setErrors(errs);
    if (!ok) {
      toast({
        title: "Please fix the highlighted fields",
        description: errs.ssn_last4 || errs.date_of_birth ? "Check the Identity section too." : undefined,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("tenants").insert({
      full_name: `${basics.first_name} ${basics.last_name}`.trim(),
      first_name: basics.first_name.trim(),
      last_name: basics.last_name.trim(),
      phone: basics.phone || null,
      email: basics.email || null,
      mailing_address: basics.mailing_address || null,
      date_of_birth: getField(identity, "date_of_birth").value || null,
      ssn_last4: getField(identity, "ssn_last4").value || null,
      identity_info: sectionValue(identity, IDENTITY_FIELDS) as never,
      employment_info: sectionValue(employment, EMPLOYMENT_FIELDS) as never,
      bank_info: sectionValue(bank, BANK_FIELDS) as never,
      previous_address: sectionValue(prevAddress, PREVIOUS_ADDRESS_FIELDS) as never,
      drivers_license: sectionValue(license, LICENSE_FIELDS) as never,
      vehicles: vehicles as never,
      emergency_contacts: contacts as never,
      tenant_references: references as never,
    }).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Could not create tenant", description: error?.message, variant: "destructive" });
      return;
    }
    await save({ primary_tenant_id: data.id });
    await load();
    setMode("select");
    setErrors({});
    toast({ title: "Tenant added" });
  };

  const Err = ({ name }: { name: string }) =>
    errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null;

  const renderList = (
    title: string,
    keys: string[],
    rows: any[],
    setRows: (r: any[]) => void,
  ) => (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {keys.map((k) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs capitalize">{k.replace(/_/g, " ")}</Label>
                <Input
                  className="h-8"
                  value={row[k] ?? ""}
                  onChange={(e) => setRows(rows.map((r, ri) => (ri === i ? { ...r, [k]: e.target.value } : r)))}
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, ri) => ri !== i))}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, emptyRow(keys)])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add {title}
      </Button>
    </div>
  );

  const renderFields = (
    fields: readonly (readonly [string, string, string])[],
    section: Section,
    setSection: (s: Section) => void,
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, label, type]) => (
        <VerifiedFieldInput
          key={key}
          label={label}
          type={type}
          field={getField(section, key)}
          onChange={(f) => setSection({ ...section, [key]: f })}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 4 — Tenant</CardTitle></CardHeader>
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
            <Label>Tenant *</Label>
            <Select value={matter?.primary_tenant_id ?? ""} onValueChange={(v) => save({ primary_tenant_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!tenants.length && <p className="text-xs text-muted-foreground">No tenants on file for this client yet.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First name *</Label>
                <Input value={basics.first_name} onChange={(e) => setBasics({ ...basics, first_name: e.target.value })} />
                <Err name="first_name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last name *</Label>
                <Input value={basics.last_name} onChange={(e) => setBasics({ ...basics, last_name: e.target.value })} />
                <Err name="last_name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={basics.phone} onChange={(e) => setBasics({ ...basics, phone: e.target.value })} />
                <Err name="phone" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={basics.email} onChange={(e) => setBasics({ ...basics, email: e.target.value })} />
                <Err name="email" />
              </div>
            </div>

            {(errors.ssn_last4 || errors.date_of_birth) && (
              <p className="text-xs text-destructive">
                Identity section: {errors.ssn_last4 || errors.date_of_birth}
              </p>
            )}

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="identity">
                <AccordionTrigger className="text-sm">Identity</AccordionTrigger>
                <AccordionContent>{renderFields(IDENTITY_FIELDS, identity, setIdentity)}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="employment">
                <AccordionTrigger className="text-sm">Employment</AccordionTrigger>
                <AccordionContent>{renderFields(EMPLOYMENT_FIELDS, employment, setEmployment)}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="license">
                <AccordionTrigger className="text-sm">Driver License</AccordionTrigger>
                <AccordionContent>{renderFields(LICENSE_FIELDS, license, setLicense)}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="bank">
                <AccordionTrigger className="text-sm">Bank Information</AccordionTrigger>
                <AccordionContent>{renderFields(BANK_FIELDS, bank, setBank)}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="previous">
                <AccordionTrigger className="text-sm">Previous Address</AccordionTrigger>
                <AccordionContent>{renderFields(PREVIOUS_ADDRESS_FIELDS, prevAddress, setPrevAddress)}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="vehicles">
                <AccordionTrigger className="text-sm">Vehicles</AccordionTrigger>
                <AccordionContent>
                  {renderList("vehicle", ["make", "model", "year", "color", "plate", "source"], vehicles, setVehicles)}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contacts">
                <AccordionTrigger className="text-sm">Emergency Contacts</AccordionTrigger>
                <AccordionContent>
                  {renderList("contact", ["name", "relationship", "phone", "email", "source"], contacts, setContacts)}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="references">
                <AccordionTrigger className="text-sm">References</AccordionTrigger>
                <AccordionContent>
                  {renderList("reference", ["name", "relationship", "phone", "notes", "source"], references, setReferences)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="button" onClick={createTenant} disabled={saving}>
              {saving ? "Saving…" : "Save tenant"}
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={next} disabled={!matter?.primary_tenant_id}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
