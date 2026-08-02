import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { MATTER_TYPE_LABELS, formatCurrency, logMatterEvent } from "@/lib/matter";
import { balancesMatch } from "@/lib/intake-validation";
import { transitionMatter } from "@/lib/transitions";
import type { StepProps } from "./types";

export default function StepReview({ matter, refresh, back, goTo, isAdmin }: StepProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const caseId = matter?.id as string | undefined;

  const load = useCallback(async () => {
    if (!caseId) return;
    const [prop, unit, tenant, tenancy, docs, ledger] = await Promise.all([
      matter?.property_id ? supabase.from("properties").select("*").eq("id", matter.property_id).maybeSingle() : null,
      matter?.unit_id ? supabase.from("units").select("*").eq("id", matter.unit_id).maybeSingle() : null,
      matter?.primary_tenant_id ? supabase.from("tenants").select("*").eq("id", matter.primary_tenant_id).maybeSingle() : null,
      matter?.tenancy_id ? supabase.from("tenancies").select("*").eq("id", matter.tenancy_id).maybeSingle() : null,
      supabase.from("documents").select("id").eq("case_id", caseId),
      supabase.from("ledger_entries").select("amount, payment_amount, credit_amount").eq("case_id", caseId),
    ]);
    const ledgerRows = ledger?.data ?? [];
    const ledgerBalance = ledgerRows.length
      ? Math.round(
          ledgerRows.reduce(
            (s, r) => s + Number(r.amount ?? 0) - Number(r.payment_amount ?? 0) - Number(r.credit_amount ?? 0),
            0,
          ) * 100,
        ) / 100
      : null;
    setSummary({
      property: prop?.data ?? null,
      unit: unit?.data ?? null,
      tenant: tenant?.data ?? null,
      tenancy: tenancy?.data ?? null,
      docCount: docs?.data?.length ?? 0,
      ledgerCount: ledgerRows.length,
      ledgerBalance,
    });
  }, [caseId, matter?.property_id, matter?.unit_id, matter?.primary_tenant_id, matter?.tenancy_id]);

  useEffect(() => { load(); }, [load]);

  const issues: { label: string; step: number }[] = [];
  if (!matter?.client_id) issues.push({ label: "Client not selected", step: 1 });
  if (!matter?.property_id) issues.push({ label: "Property not selected", step: 2 });
  if (!matter?.primary_tenant_id) issues.push({ label: "Tenant not selected", step: 4 });
  if (!matter?.tenancy_id) issues.push({ label: "Tenancy details missing", step: 5 });
  if (!matter?.matter_type) issues.push({ label: "Matter type not selected", step: 6 });
  if (matter?.matter_type === "non_payment") {
    if (!matter?.first_unpaid_month) issues.push({ label: "First unpaid month is required for non-payment", step: 6 });
    if (!matter?.current_balance || Number(matter.current_balance) <= 0) {
      issues.push({ label: "Balance owed must be greater than zero", step: 6 });
    }
    if (!summary.ledgerCount) issues.push({ label: "Add at least one rent ledger line", step: 7 });
  }
  if (summary.ledgerBalance != null && summary.ledgerBalance < 0) {
    issues.push({ label: "Rent ledger balance cannot be negative", step: 7 });
  }
  if (
    summary.ledgerBalance != null &&
    !balancesMatch(matter?.current_balance != null ? Number(matter.current_balance) : 0, summary.ledgerBalance)
  ) {
    issues.push({ label: "Balance owed does not match the rent ledger total", step: 7 });
  }
  if (!summary.docCount) issues.push({ label: "Upload at least one supporting document", step: 8 });

  const submitted = !!matter?.submitted_at;

  const submit = async () => {
    if (!caseId || issues.length) return;
    setSubmitting(true);
    try {
      await transitionMatter(caseId, "submit_for_review", null);
    } catch (e) {
      setSubmitting(false);
      toast({ title: "Submission failed", description: (e as Error).message, variant: "destructive" });
      return;
    }
    setSubmitting(false);
    await logMatterEvent({
      caseId,
      eventKey: "matter_submitted",
      label: "Matter submitted for attorney review",
    });
    await refresh();
    toast({ title: "Matter submitted for attorney review" });
    navigate(isAdmin ? `/admin/cases/${caseId}` : `/client/cases/${caseId}`);
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 10 — Review & Submit</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <Row label="Matter number" value={matter?.case_number} />
          <Row label="Matter type" value={matter?.matter_type ? MATTER_TYPE_LABELS[matter.matter_type] : null} />
          <Row
            label="Property"
            value={summary.property ? `${summary.property.address_line1}, ${summary.property.city} ${summary.property.state}` : null}
          />
          <Row label="Unit" value={summary.unit ? `Unit ${summary.unit.unit_number}` : "—"} />
          <Row label="Tenant" value={summary.tenant?.full_name} />
          <Row label="Monthly rent" value={summary.tenancy?.monthly_rent != null ? formatCurrency(Number(summary.tenancy.monthly_rent)) : null} />
          <Row label="Balance owed" value={formatCurrency(matter?.current_balance != null ? Number(matter.current_balance) : null)} />
          <Row label="Ledger lines" value={summary.ledgerCount} />
          <Row label="Documents" value={summary.docCount} />
        </div>

        {issues.length > 0 ? (
          <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" /> Complete these before submitting
            </p>
            {issues.map((i) => (
              <button key={i.label} onClick={() => goTo(i.step)} className="block text-sm underline underline-offset-2">
                {i.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> All required information is present.
          </p>
        )}

        {submitted && <Badge variant="secondary">Submitted — locked for editing</Badge>}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={submit} disabled={submitting || issues.length > 0 || submitted}>
            {submitting ? "Submitting…" : "Submit for attorney review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
