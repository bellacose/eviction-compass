import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DEBTOR_TYPES, ORIGIN_OPTIONS } from "@/lib/collections";

export default function NewCollectionMatter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sp] = useSearchParams();
  const presetCaseId = sp.get("case_id") || "";
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [debtorType, setDebtorType] = useState("tenant");
  const [debtorName, setDebtorName] = useState("");
  const [debtorEmail, setDebtorEmail] = useState("");
  const [debtorPhone, setDebtorPhone] = useState("");
  const [origin, setOrigin] = useState("manual");
  const [principal, setPrincipal] = useState("");
  const [courtCosts, setCourtCosts] = useState("");
  const [legalFees, setLegalFees] = useState("");
  const [interestRate, setInterestRate] = useState("9");
  const [description, setDescription] = useState("");
  const [caseId, setCaseId] = useState(presetCaseId);

  useEffect(() => {
    supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name")
      .then(({ data }) => setClients(data || []));
    if (presetCaseId) {
      supabase.from("cases").select("client_id, primary_tenant_id, tenants(full_name)").eq("id", presetCaseId).single()
        .then(({ data }: any) => {
          if (data) {
            setClientId(data.client_id);
            setDebtorName(data.tenants?.full_name || "");
            setOrigin("case_closed_balance");
          }
        });
    }
  }, [presetCaseId]);

  const submit = async () => {
    if (!clientId || !debtorName.trim()) {
      toast({ title: "Client and debtor name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: debtor, error: dErr } = await supabase.from("debtors").insert({
      client_id: clientId,
      debtor_type: debtorType as any,
      full_name: debtorName.trim(),
      email: debtorEmail.trim() || null,
      phone: debtorPhone.trim() || null,
      created_by: user?.id,
    }).select().single();
    if (dErr || !debtor) {
      toast({ title: "Could not create debtor", description: dErr?.message, variant: "destructive" });
      setSaving(false); return;
    }
    const { data: matter, error: mErr } = await supabase.from("collection_matters").insert({
      client_id: clientId,
      debtor_id: debtor.id,
      case_id: caseId || null,
      origin: origin as any,
      principal: Number(principal || 0),
      court_costs: Number(courtCosts || 0),
      legal_fees: Number(legalFees || 0),
      interest_rate: Number(interestRate || 0),
      description: description.trim() || null,
      created_by: user?.id,
    }).select().single();
    setSaving(false);
    if (mErr || !matter) {
      toast({ title: "Could not create matter", description: mErr?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Collection matter created" });
    navigate(`/admin/collections/${matter.id}`);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">New Collection Matter</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Debtor</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Debtor Type</Label>
            <Select value={debtorType} onValueChange={setDebtorType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEBTOR_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Debtor Name *</Label><Input value={debtorName} onChange={(e) => setDebtorName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={debtorEmail} onChange={(e) => setDebtorEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={debtorPhone} onChange={(e) => setDebtorPhone(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Debt</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Origin</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORIGIN_OPTIONS.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Linked Case ID (optional)</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="UUID" /></div>
          <div className="space-y-1.5"><Label>Principal ($)</Label><Input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Court Costs ($)</Label><Input type="number" step="0.01" value={courtCosts} onChange={(e) => setCourtCosts(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Legal Fees ($)</Label><Input type="number" step="0.01" value={legalFees} onChange={(e) => setLegalFees(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Interest Rate (%/yr)</Label><Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate("/admin/collections")}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Matter"}</Button>
      </div>
    </div>
  );
}