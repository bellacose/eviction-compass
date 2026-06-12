import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchMatterBalance, fmtMoney, statusColor, STATUS_OPTIONS, MatterBalance } from "@/lib/collections";

export default function CollectionMatterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [matter, setMatter] = useState<any>(null);
  const [balance, setBalance] = useState<MatterBalance | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [enforcement, setEnforcement] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);

  // dialogs
  const [actDlg, setActDlg] = useState(false);
  const [payDlg, setPayDlg] = useState(false);
  const [enfDlg, setEnfDlg] = useState(false);

  // form state
  const [actType, setActType] = useState("note");
  const [actContent, setActContent] = useState("");
  const [actInternal, setActInternal] = useState(false);
  const [payType, setPayType] = useState("payment");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");
  const [enfType, setEnfType] = useState("wage_garnishment");
  const [enfStatus, setEnfStatus] = useState("drafted");
  const [enfAmount, setEnfAmount] = useState("");
  const [enfNotes, setEnfNotes] = useState("");

  const load = async () => {
    if (!id) return;
    const [m, a, p, e, ag] = await Promise.all([
      supabase.from("collection_matters").select("*, debtors(*), clients(company_name), cases(case_number), collection_agencies(name)").eq("id", id).single(),
      supabase.from("collection_activities").select("*, profiles(full_name)").eq("matter_id", id).order("activity_at", { ascending: false }),
      supabase.from("collection_payments").select("*").eq("matter_id", id).order("payment_date", { ascending: false }),
      supabase.from("enforcement_actions").select("*").eq("matter_id", id).order("created_at", { ascending: false }),
      supabase.from("collection_agencies").select("id, name, default_commission_pct").eq("is_active", true).order("name"),
    ]);
    setMatter(m.data);
    setActivities(a.data || []);
    setPayments(p.data || []);
    setEnforcement(e.data || []);
    setAgencies(ag.data || []);
    setBalance(await fetchMatterBalance(id));
  };

  useEffect(() => { load(); }, [id]);

  const updateField = async (patch: any) => {
    await supabase.from("collection_matters").update(patch).eq("id", id!);
    load();
  };

  const addActivity = async () => {
    if (!actContent.trim()) return;
    await supabase.from("collection_activities").insert({
      matter_id: id, activity_type: actType as any, content: actContent.trim(),
      is_internal: actInternal, created_by: user?.id,
    });
    setActContent(""); setActInternal(false); setActDlg(false); load();
  };

  const addPayment = async () => {
    if (!payAmount) return;
    await supabase.from("collection_payments").insert({
      matter_id: id, payment_type: payType as any, amount: Number(payAmount),
      payment_date: payDate, notes: payNotes.trim() || null, created_by: user?.id,
    });
    setPayAmount(""); setPayNotes(""); setPayDlg(false); load();
    toast({ title: "Payment recorded" });
  };

  const addEnforcement = async () => {
    await supabase.from("enforcement_actions").insert({
      matter_id: id, action_type: enfType as any, status: enfStatus as any,
      amount: enfAmount ? Number(enfAmount) : null, notes: enfNotes.trim() || null, created_by: user?.id,
    });
    setEnfAmount(""); setEnfNotes(""); setEnfDlg(false); load();
  };

  if (!matter) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/collections"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{matter.matter_number}</h1>
            <Badge className={`text-xs capitalize ${statusColor(matter.status)}`} variant="outline">{matter.status?.replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{matter.origin?.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {matter.debtors?.full_name} · {matter.clients?.company_name}
            {matter.cases?.case_number && <> · Case <Link to={`/admin/cases/${matter.case_id}`} className="underline">{matter.cases.case_number}</Link></>}
          </p>
        </div>
      </div>

      {/* Balance summary */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Principal</div><div className="font-mono font-medium">{fmtMoney(balance?.principal)}</div></div>
          <div><div className="text-xs text-muted-foreground">Court Costs + Fees</div><div className="font-mono font-medium">{fmtMoney((balance?.court_costs || 0) + (balance?.legal_fees || 0))}</div></div>
          <div><div className="text-xs text-muted-foreground">Accrued Interest</div><div className="font-mono font-medium">{fmtMoney(balance?.accrued_interest)}</div></div>
          <div><div className="text-xs text-muted-foreground">Payments</div><div className="font-mono font-medium">−{fmtMoney(balance?.payments_total)}</div></div>
          <div className="col-span-2 md:col-span-4 pt-3 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className="text-2xl font-bold font-mono">{fmtMoney(balance?.balance_due)}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Debtor</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-medium">{matter.debtors?.full_name}</div>
                <div className="text-muted-foreground capitalize">{matter.debtors?.debtor_type?.replace(/_/g, " ")}</div>
                {matter.debtors?.email && <div>{matter.debtors.email}</div>}
                {matter.debtors?.phone && <div>{matter.debtors.phone}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Status & Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={matter.status} onValueChange={(v) => updateField({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Principal</Label><Input type="number" defaultValue={matter.principal} onBlur={(e) => updateField({ principal: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Interest Rate %</Label><Input type="number" defaultValue={matter.interest_rate} onBlur={(e) => updateField({ interest_rate: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Court Costs</Label><Input type="number" defaultValue={matter.court_costs} onBlur={(e) => updateField({ court_costs: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Legal Fees</Label><Input type="number" defaultValue={matter.legal_fees} onBlur={(e) => updateField({ legal_fees: Number(e.target.value) })} /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Activity Log</CardTitle>
              <Button size="sm" onClick={() => setActDlg(true)}><Plus className="h-3 w-3 mr-1" />Log Activity</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {activities.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p> : activities.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize text-[10px]">{a.activity_type?.replace(/_/g, " ")}</Badge>
                    {a.is_internal && <Badge variant="outline" className="text-[10px] bg-status-warning/10 text-status-warning"><Lock className="h-2.5 w-2.5 mr-1" />Internal</Badge>}
                    <span className="text-xs text-muted-foreground">{format(new Date(a.activity_at), "MMM d, yyyy h:mm a")} · {(a.profiles as any)?.full_name}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{a.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Payments & Adjustments</CardTitle>
              <Button size="sm" onClick={() => setPayDlg(true)}><Plus className="h-3 w-3 mr-1" />Record Payment</Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {payments.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No payments yet</p> : payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                  <span className="text-muted-foreground w-28">{format(new Date(p.payment_date), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{p.payment_type?.replace(/_/g, " ")}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">{p.notes}</span>
                  <span className="font-mono font-medium">{fmtMoney(p.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enforcement">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm">Enforcement Actions</CardTitle>
              <Button size="sm" onClick={() => setEnfDlg(true)}><Plus className="h-3 w-3 mr-1" />Add Action</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {enforcement.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No enforcement actions</p> : enforcement.map((e) => (
                <div key={e.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{e.action_type?.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                    {e.amount && <span className="ml-auto font-mono">{fmtMoney(e.amount)}</span>}
                  </div>
                  {e.notes && <p className="mt-1 text-muted-foreground">{e.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment">
          <Card>
            <CardHeader><CardTitle className="text-sm">Agency Placement / Sale</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Collection Agency</Label>
                <Select value={matter.agency_id || "none"} onValueChange={(v) => updateField({ agency_id: v === "none" ? null : v, agency_placed_at: v === "none" ? null : new Date().toISOString(), status: v === "none" ? matter.status : "placed_with_agency" })}>
                  <SelectTrigger><SelectValue placeholder="Not placed" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not placed</SelectItem>
                    {agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Sold To (buyer)</Label><Input defaultValue={matter.sold_to || ""} onBlur={(e) => updateField({ sold_to: e.target.value || null })} /></div>
                <div><Label className="text-xs">Sale Date</Label><Input type="date" defaultValue={matter.sold_at || ""} onBlur={(e) => updateField({ sold_at: e.target.value || null })} /></div>
                <div><Label className="text-xs">Sale Price</Label><Input type="number" defaultValue={matter.sold_price || ""} onBlur={(e) => updateField({ sold_price: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity dialog */}
      <Dialog open={actDlg} onOpenChange={setActDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={actType} onValueChange={setActType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["note","call","letter","email","demand","status_change","other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea rows={4} value={actContent} onChange={(e) => setActContent(e.target.value)} placeholder="What happened?" />
            <div className="flex items-center gap-2"><Switch checked={actInternal} onCheckedChange={setActInternal} /><Label>Internal only (hidden from client)</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setActDlg(false)}>Cancel</Button><Button onClick={addActivity}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payDlg} onOpenChange={setPayDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment / Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={payType} onValueChange={setPayType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["payment","adjustment","write_off","commission","court_cost_recovery","interest_adjustment"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
              <div><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
            </div>
            <Textarea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Notes (optional)" />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayDlg(false)}>Cancel</Button><Button onClick={addPayment}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enforcement dialog */}
      <Dialog open={enfDlg} onOpenChange={setEnfDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Enforcement Action</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={enfType} onValueChange={setEnfType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["wage_garnishment","bank_levy","property_lien","income_execution","restraining_notice","other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={enfStatus} onValueChange={setEnfStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["drafted","filed","served","active","satisfied","released","closed"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Amount (optional)</Label><Input type="number" step="0.01" value={enfAmount} onChange={(e) => setEnfAmount(e.target.value)} /></div>
            <Textarea rows={3} value={enfNotes} onChange={(e) => setEnfNotes(e.target.value)} placeholder="Notes" />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEnfDlg(false)}>Cancel</Button><Button onClick={addEnforcement}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}