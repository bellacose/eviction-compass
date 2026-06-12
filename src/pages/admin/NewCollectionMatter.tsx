import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  DEBTOR_TYPES, ORIGIN_OPTIONS, PRIORITY_OPTIONS, PAY_FREQUENCIES,
  SKIP_TRACE_STATUSES, BANKRUPTCY_CHAPTERS, BANK_ACCOUNT_TYPES,
} from "@/lib/collections";

export default function NewCollectionMatter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sp] = useSearchParams();
  const presetCaseId = sp.get("case_id") || "";
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState(presetCaseId);

  // Debtor
  const [debtor, setDebtor] = useState<any>({
    debtor_type: "tenant", full_name: "", email: "", phone: "",
    date_of_birth: "", ssn_last4: "", ein_last4: "", drivers_license: "", dl_state: "",
    alias: "", dba: "", phone_secondary: "", email_secondary: "",
    address: "", mailing_address: "", forwarding_address: "",
    employer_name: "", employer_address: "", employer_phone: "", job_title: "",
    pay_frequency: "", est_wages: "", wages_period: "monthly",
    bank_name: "", bank_branch: "", bank_account_type: "", bank_account_last4: "",
    skip_trace_status: "", skip_trace_date: "", skip_trace_source: "",
    bankruptcy_filed: false, bankruptcy_case_number: "", bankruptcy_chapter: "",
    is_active_military: false, represented_by_attorney: false,
    debtor_attorney_name: "", debtor_attorney_phone: "",
    cease_and_desist: false, cease_and_desist_date: "",
    notes: "",
  });

  // Matter
  const [matter, setMatter] = useState<any>({
    origin: "manual",
    principal: "", interest_rate: "9", interest_start_date: new Date().toISOString().slice(0,10),
    interest_end_date: "", interest_paid_through: "",
    court_costs: "", legal_fees: "", filing_fees: "", service_fees: "", attorney_fees: "", other_fees: "",
    judgment_date: "", judgment_entered_date: "", judgment_expiration_date: "", judgment_renewal_date: "",
    sol_expiration_date: "", sol_state: "",
    demand_letter_sent_date: "", validation_notice_sent_date: "",
    last_contact_date: "", last_payment_date: "", next_action_date: "",
    settlement_offer_amount: "", settlement_accepted: false, settlement_terms: "",
    priority: "medium", tags: "",
    original_creditor: "", original_account_number: "",
    description: "",
  });

  const setD = (k: string, v: any) => setDebtor((d: any) => ({ ...d, [k]: v }));
  const setM = (k: string, v: any) => setMatter((m: any) => ({ ...m, [k]: v }));

  useEffect(() => {
    supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name")
      .then(({ data }) => setClients(data || []));
    if (presetCaseId) {
      supabase.from("cases").select("client_id, primary_tenant_id, tenants(full_name)").eq("id", presetCaseId).single()
        .then(({ data }: any) => {
          if (data) {
            setClientId(data.client_id);
            setD("full_name", data.tenants?.full_name || "");
            setM("origin", "case_closed_balance");
          }
        });
    }
  }, [presetCaseId]);

  const num = (v: any) => v === "" || v == null ? null : Number(v);
  const numZ = (v: any) => Number(v || 0);
  const dt = (v: any) => v ? v : null;
  const txt = (v: any) => (v && String(v).trim() ? String(v).trim() : null);

  const submit = async () => {
    if (!clientId || !debtor.full_name.trim()) {
      toast({ title: "Client and debtor name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const debtorInsert: any = {
      client_id: clientId,
      debtor_type: debtor.debtor_type as any,
      full_name: debtor.full_name.trim(),
      email: txt(debtor.email),
      phone: txt(debtor.phone),
      date_of_birth: dt(debtor.date_of_birth),
      ssn_last4: txt(debtor.ssn_last4),
      ein_last4: txt(debtor.ein_last4),
      drivers_license: txt(debtor.drivers_license),
      dl_state: txt(debtor.dl_state),
      alias: txt(debtor.alias),
      dba: txt(debtor.dba),
      phone_secondary: txt(debtor.phone_secondary),
      email_secondary: txt(debtor.email_secondary),
      address: txt(debtor.address),
      mailing_address: txt(debtor.mailing_address),
      forwarding_address: txt(debtor.forwarding_address),
      employer_name: txt(debtor.employer_name),
      employer_address: txt(debtor.employer_address),
      employer_phone: txt(debtor.employer_phone),
      job_title: txt(debtor.job_title),
      pay_frequency: txt(debtor.pay_frequency),
      est_wages: num(debtor.est_wages),
      wages_period: txt(debtor.wages_period),
      bank_name: txt(debtor.bank_name),
      bank_branch: txt(debtor.bank_branch),
      bank_account_type: txt(debtor.bank_account_type),
      bank_account_last4: txt(debtor.bank_account_last4),
      skip_trace_status: txt(debtor.skip_trace_status),
      skip_trace_date: dt(debtor.skip_trace_date),
      skip_trace_source: txt(debtor.skip_trace_source),
      bankruptcy_filed: !!debtor.bankruptcy_filed,
      bankruptcy_case_number: txt(debtor.bankruptcy_case_number),
      bankruptcy_chapter: txt(debtor.bankruptcy_chapter),
      is_active_military: !!debtor.is_active_military,
      represented_by_attorney: !!debtor.represented_by_attorney,
      debtor_attorney_name: txt(debtor.debtor_attorney_name),
      debtor_attorney_phone: txt(debtor.debtor_attorney_phone),
      cease_and_desist: !!debtor.cease_and_desist,
      cease_and_desist_date: dt(debtor.cease_and_desist_date),
      notes: txt(debtor.notes),
      created_by: user?.id,
    };
    const { data: debtorRow, error: dErr } = await supabase.from("debtors").insert(debtorInsert).select().single();
    if (dErr || !debtorRow) {
      toast({ title: "Could not create debtor", description: dErr?.message, variant: "destructive" });
      setSaving(false); return;
    }
    const tagsArr = (matter.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const matterInsert: any = {
      client_id: clientId,
      debtor_id: debtorRow.id,
      case_id: caseId || null,
      origin: matter.origin as any,
      principal: numZ(matter.principal),
      court_costs: numZ(matter.court_costs),
      legal_fees: numZ(matter.legal_fees),
      filing_fees: numZ(matter.filing_fees),
      service_fees: numZ(matter.service_fees),
      attorney_fees: numZ(matter.attorney_fees),
      other_fees: numZ(matter.other_fees),
      interest_rate: numZ(matter.interest_rate),
      interest_start_date: dt(matter.interest_start_date),
      interest_end_date: dt(matter.interest_end_date),
      interest_paid_through: dt(matter.interest_paid_through),
      judgment_date: dt(matter.judgment_date),
      judgment_entered_date: dt(matter.judgment_entered_date),
      judgment_expiration_date: dt(matter.judgment_expiration_date),
      judgment_renewal_date: dt(matter.judgment_renewal_date),
      sol_expiration_date: dt(matter.sol_expiration_date),
      sol_state: txt(matter.sol_state),
      demand_letter_sent_date: dt(matter.demand_letter_sent_date),
      validation_notice_sent_date: dt(matter.validation_notice_sent_date),
      last_contact_date: dt(matter.last_contact_date),
      last_payment_date: dt(matter.last_payment_date),
      next_action_date: dt(matter.next_action_date),
      settlement_offer_amount: num(matter.settlement_offer_amount),
      settlement_accepted: matter.settlement_offer_amount ? !!matter.settlement_accepted : null,
      settlement_terms: txt(matter.settlement_terms),
      priority: matter.priority,
      tags: tagsArr,
      original_creditor: txt(matter.original_creditor),
      original_account_number: txt(matter.original_account_number),
      description: txt(matter.description),
      created_by: user?.id,
    };
    const { data: m, error: mErr } = await supabase.from("collection_matters").insert(matterInsert).select().single();
    setSaving(false);
    if (mErr || !m) {
      toast({ title: "Could not create matter", description: mErr?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Collection matter created" });
    navigate(`/admin/collections/${m.id}`);
  };

  const Field = ({ label, children, span }: any) => (
    <div className={`space-y-1.5 ${span || ""}`}><Label className="text-xs">{label}</Label>{children}</div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">New Collection Matter</h1>

      <Card><CardContent className="p-4 grid md:grid-cols-3 gap-4">
        <Field label="Client *">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Debtor Type">
          <Select value={debtor.debtor_type} onValueChange={(v) => setD("debtor_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEBTOR_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={matter.priority} onValueChange={(v) => setM("priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Debtor Name *" span="md:col-span-2"><Input value={debtor.full_name} onChange={(e) => setD("full_name", e.target.value)} /></Field>
        <Field label="Linked Case ID"><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="optional" /></Field>
      </CardContent></Card>

      <Accordion type="multiple" defaultValue={["debt"]} className="space-y-2">
        {/* DEBTOR — Identity & Contact */}
        <AccordionItem value="identity" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Debtor — Identity & Contact</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Alias"><Input value={debtor.alias} onChange={(e) => setD("alias", e.target.value)} /></Field>
            <Field label="DBA"><Input value={debtor.dba} onChange={(e) => setD("dba", e.target.value)} /></Field>
            <Field label="Date of Birth"><Input type="date" value={debtor.date_of_birth} onChange={(e) => setD("date_of_birth", e.target.value)} /></Field>
            <Field label="SSN (last 4)"><Input maxLength={4} value={debtor.ssn_last4} onChange={(e) => setD("ssn_last4", e.target.value)} /></Field>
            <Field label="EIN (last 4)"><Input maxLength={4} value={debtor.ein_last4} onChange={(e) => setD("ein_last4", e.target.value)} /></Field>
            <Field label="Driver's License"><Input value={debtor.drivers_license} onChange={(e) => setD("drivers_license", e.target.value)} /></Field>
            <Field label="DL State"><Input maxLength={2} value={debtor.dl_state} onChange={(e) => setD("dl_state", e.target.value.toUpperCase())} /></Field>
            <Field label="Email"><Input type="email" value={debtor.email} onChange={(e) => setD("email", e.target.value)} /></Field>
            <Field label="Email (secondary)"><Input type="email" value={debtor.email_secondary} onChange={(e) => setD("email_secondary", e.target.value)} /></Field>
            <Field label="Phone"><Input value={debtor.phone} onChange={(e) => setD("phone", e.target.value)} /></Field>
            <Field label="Phone (secondary)"><Input value={debtor.phone_secondary} onChange={(e) => setD("phone_secondary", e.target.value)} /></Field>
            <div />
            <Field label="Address" span="md:col-span-3"><Input value={debtor.address} onChange={(e) => setD("address", e.target.value)} /></Field>
            <Field label="Mailing Address" span="md:col-span-3"><Input value={debtor.mailing_address} onChange={(e) => setD("mailing_address", e.target.value)} /></Field>
            <Field label="Forwarding Address" span="md:col-span-3"><Input value={debtor.forwarding_address} onChange={(e) => setD("forwarding_address", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* Employment */}
        <AccordionItem value="employment" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Debtor — Employment</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Employer" span="md:col-span-2"><Input value={debtor.employer_name} onChange={(e) => setD("employer_name", e.target.value)} /></Field>
            <Field label="Job Title"><Input value={debtor.job_title} onChange={(e) => setD("job_title", e.target.value)} /></Field>
            <Field label="Employer Address" span="md:col-span-2"><Input value={debtor.employer_address} onChange={(e) => setD("employer_address", e.target.value)} /></Field>
            <Field label="Employer Phone"><Input value={debtor.employer_phone} onChange={(e) => setD("employer_phone", e.target.value)} /></Field>
            <Field label="Pay Frequency">
              <Select value={debtor.pay_frequency} onValueChange={(v) => setD("pay_frequency", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PAY_FREQUENCIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Estimated Wages ($)"><Input type="number" step="0.01" value={debtor.est_wages} onChange={(e) => setD("est_wages", e.target.value)} /></Field>
            <Field label="Wages Period">
              <Select value={debtor.wages_period} onValueChange={(v) => setD("wages_period", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["hour","week","biweekly","month","year"].map((p) => <SelectItem key={p} value={p} className="capitalize">per {p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </AccordionContent>
        </AccordionItem>

        {/* Banking & Assets */}
        <AccordionItem value="banking" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Debtor — Banking & Assets</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Bank Name"><Input value={debtor.bank_name} onChange={(e) => setD("bank_name", e.target.value)} /></Field>
            <Field label="Branch"><Input value={debtor.bank_branch} onChange={(e) => setD("bank_branch", e.target.value)} /></Field>
            <Field label="Account Type">
              <Select value={debtor.bank_account_type} onValueChange={(v) => setD("bank_account_type", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BANK_ACCOUNT_TYPES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Account (last 4)"><Input maxLength={4} value={debtor.bank_account_last4} onChange={(e) => setD("bank_account_last4", e.target.value)} /></Field>
            <Field label="Notes (assets, vehicles, property)" span="md:col-span-3"><Textarea rows={3} value={debtor.notes} onChange={(e) => setD("notes", e.target.value)} placeholder="Year/make/VIN, real property, other assets…" /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* Compliance & Skip-trace */}
        <AccordionItem value="compliance" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Debtor — Compliance & Skip-Trace</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Skip-Trace Status">
              <Select value={debtor.skip_trace_status} onValueChange={(v) => setD("skip_trace_status", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{SKIP_TRACE_STATUSES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Skip-Trace Date"><Input type="date" value={debtor.skip_trace_date} onChange={(e) => setD("skip_trace_date", e.target.value)} /></Field>
            <Field label="Skip-Trace Source"><Input value={debtor.skip_trace_source} onChange={(e) => setD("skip_trace_source", e.target.value)} /></Field>

            <div className="flex items-center gap-2"><Switch checked={debtor.bankruptcy_filed} onCheckedChange={(v) => setD("bankruptcy_filed", v)} /><Label>Bankruptcy Filed</Label></div>
            <Field label="Bankruptcy Case #"><Input value={debtor.bankruptcy_case_number} onChange={(e) => setD("bankruptcy_case_number", e.target.value)} disabled={!debtor.bankruptcy_filed} /></Field>
            <Field label="Chapter">
              <Select value={debtor.bankruptcy_chapter} onValueChange={(v) => setD("bankruptcy_chapter", v)} disabled={!debtor.bankruptcy_filed}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BANKRUPTCY_CHAPTERS.map((p) => <SelectItem key={p} value={p}>{p === "none" ? "—" : `Chapter ${p}`}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <div className="flex items-center gap-2"><Switch checked={debtor.is_active_military} onCheckedChange={(v) => setD("is_active_military", v)} /><Label>Active Military (SCRA)</Label></div>
            <div className="flex items-center gap-2"><Switch checked={debtor.represented_by_attorney} onCheckedChange={(v) => setD("represented_by_attorney", v)} /><Label>Represented by Attorney</Label></div>
            <div className="flex items-center gap-2"><Switch checked={debtor.cease_and_desist} onCheckedChange={(v) => setD("cease_and_desist", v)} /><Label>Cease & Desist</Label></div>

            <Field label="Attorney Name"><Input value={debtor.debtor_attorney_name} onChange={(e) => setD("debtor_attorney_name", e.target.value)} disabled={!debtor.represented_by_attorney} /></Field>
            <Field label="Attorney Phone"><Input value={debtor.debtor_attorney_phone} onChange={(e) => setD("debtor_attorney_phone", e.target.value)} disabled={!debtor.represented_by_attorney} /></Field>
            <Field label="C&D Date"><Input type="date" value={debtor.cease_and_desist_date} onChange={(e) => setD("cease_and_desist_date", e.target.value)} disabled={!debtor.cease_and_desist} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* DEBT — origin + money */}
        <AccordionItem value="debt" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Debt — Origin & Money</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Origin">
              <Select value={matter.origin} onValueChange={(v) => setM("origin", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGIN_OPTIONS.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Original Creditor"><Input value={matter.original_creditor} onChange={(e) => setM("original_creditor", e.target.value)} /></Field>
            <Field label="Original Account #"><Input value={matter.original_account_number} onChange={(e) => setM("original_account_number", e.target.value)} /></Field>

            <Field label="Principal ($)"><Input type="number" step="0.01" value={matter.principal} onChange={(e) => setM("principal", e.target.value)} /></Field>
            <Field label="Interest Rate (%/yr)"><Input type="number" step="0.01" value={matter.interest_rate} onChange={(e) => setM("interest_rate", e.target.value)} /></Field>
            <div />

            <Field label="Filing Fees ($)"><Input type="number" step="0.01" value={matter.filing_fees} onChange={(e) => setM("filing_fees", e.target.value)} /></Field>
            <Field label="Service Fees ($)"><Input type="number" step="0.01" value={matter.service_fees} onChange={(e) => setM("service_fees", e.target.value)} /></Field>
            <Field label="Attorney Fees ($)"><Input type="number" step="0.01" value={matter.attorney_fees} onChange={(e) => setM("attorney_fees", e.target.value)} /></Field>
            <Field label="Other Court Costs ($)"><Input type="number" step="0.01" value={matter.court_costs} onChange={(e) => setM("court_costs", e.target.value)} /></Field>
            <Field label="Other Legal Fees ($)"><Input type="number" step="0.01" value={matter.legal_fees} onChange={(e) => setM("legal_fees", e.target.value)} /></Field>
            <Field label="Other Fees ($)"><Input type="number" step="0.01" value={matter.other_fees} onChange={(e) => setM("other_fees", e.target.value)} /></Field>

            <Field label="Description" span="md:col-span-3"><Textarea rows={3} value={matter.description} onChange={(e) => setM("description", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* Dates */}
        <AccordionItem value="dates" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Dates — Judgment, Interest, SOL, Lifecycle</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Judgment Date"><Input type="date" value={matter.judgment_date} onChange={(e) => setM("judgment_date", e.target.value)} /></Field>
            <Field label="Judgment Entered"><Input type="date" value={matter.judgment_entered_date} onChange={(e) => setM("judgment_entered_date", e.target.value)} /></Field>
            <Field label="Judgment Expiration"><Input type="date" value={matter.judgment_expiration_date} onChange={(e) => setM("judgment_expiration_date", e.target.value)} /></Field>
            <Field label="Judgment Renewal"><Input type="date" value={matter.judgment_renewal_date} onChange={(e) => setM("judgment_renewal_date", e.target.value)} /></Field>

            <Field label="Interest Start"><Input type="date" value={matter.interest_start_date} onChange={(e) => setM("interest_start_date", e.target.value)} /></Field>
            <Field label="Interest Paid Through"><Input type="date" value={matter.interest_paid_through} onChange={(e) => setM("interest_paid_through", e.target.value)} /></Field>
            <Field label="Interest End"><Input type="date" value={matter.interest_end_date} onChange={(e) => setM("interest_end_date", e.target.value)} /></Field>

            <Field label="SOL Expiration"><Input type="date" value={matter.sol_expiration_date} onChange={(e) => setM("sol_expiration_date", e.target.value)} /></Field>
            <Field label="SOL State"><Input maxLength={2} value={matter.sol_state} onChange={(e) => setM("sol_state", e.target.value.toUpperCase())} /></Field>
            <div />

            <Field label="Demand Letter Sent"><Input type="date" value={matter.demand_letter_sent_date} onChange={(e) => setM("demand_letter_sent_date", e.target.value)} /></Field>
            <Field label="Validation Notice Sent"><Input type="date" value={matter.validation_notice_sent_date} onChange={(e) => setM("validation_notice_sent_date", e.target.value)} /></Field>
            <Field label="Next Action Date"><Input type="date" value={matter.next_action_date} onChange={(e) => setM("next_action_date", e.target.value)} /></Field>
            <Field label="Last Contact"><Input type="date" value={matter.last_contact_date} onChange={(e) => setM("last_contact_date", e.target.value)} /></Field>
            <Field label="Last Payment"><Input type="date" value={matter.last_payment_date} onChange={(e) => setM("last_payment_date", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* Settlement & Extras */}
        <AccordionItem value="extras" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm">Settlement & Extras</AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-3 pt-2">
            <Field label="Settlement Offer ($)"><Input type="number" step="0.01" value={matter.settlement_offer_amount} onChange={(e) => setM("settlement_offer_amount", e.target.value)} /></Field>
            <div className="flex items-center gap-2 pt-6"><Switch checked={matter.settlement_accepted} onCheckedChange={(v) => setM("settlement_accepted", v)} /><Label>Offer Accepted</Label></div>
            <div />
            <Field label="Settlement Terms" span="md:col-span-3"><Textarea rows={2} value={matter.settlement_terms} onChange={(e) => setM("settlement_terms", e.target.value)} /></Field>
            <Field label="Tags (comma separated)" span="md:col-span-3"><Input value={matter.tags} onChange={(e) => setM("tags", e.target.value)} placeholder="high-priority, post-judgment, garnishment" /></Field>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-2 justify-end sticky bottom-0 bg-background py-3 border-t">
        <Button variant="outline" onClick={() => navigate("/admin/collections")}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create Matter"}</Button>
      </div>
    </div>
  );
}