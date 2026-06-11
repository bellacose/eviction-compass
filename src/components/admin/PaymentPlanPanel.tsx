import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarClock, Check, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Plan = {
  id: string;
  start_date: string;
  frequency: "weekly" | "biweekly" | "monthly";
  installment_count: number;
  installment_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
};

type Payment = {
  id: string;
  payment_plan_id: string | null;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  paid_date: string | null;
  status: "scheduled" | "paid" | "partial" | "missed" | "cancelled";
  method: string | null;
  notes: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  paid: "bg-status-success/15 text-status-success",
  partial: "bg-status-warning/15 text-status-warning",
  missed: "bg-status-danger/15 text-status-danger",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export default function PaymentPlanPanel({ caseId, userId }: { caseId: string; userId?: string }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    start_date: new Date().toISOString().slice(0, 10),
    frequency: "monthly" as Plan["frequency"],
    installment_count: "3",
    installment_amount: "",
    notes: "",
  });
  const [adhocForm, setAdhocForm] = useState({
    due_date: new Date().toISOString().slice(0, 10),
    amount_due: "",
    notes: "",
  });

  const load = async () => {
    const [p, s] = await Promise.all([
      supabase.from("payment_plans").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
      supabase.from("scheduled_payments").select("*").eq("case_id", caseId).order("due_date"),
    ]);
    setPlans((p.data as Plan[]) || []);
    setPayments((s.data as Payment[]) || []);
  };

  useEffect(() => { if (caseId) load(); }, [caseId]);

  const createPlan = async () => {
    const count = parseInt(planForm.installment_count, 10);
    const amount = parseFloat(planForm.installment_amount);
    if (!count || count < 1 || isNaN(amount) || amount < 0) {
      toast({ title: "Invalid plan", description: "Check installment count and amount.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("payment_plans").insert({
      case_id: caseId,
      start_date: planForm.start_date,
      frequency: planForm.frequency,
      installment_count: count,
      installment_amount: amount,
      total_amount: amount * count,
      notes: planForm.notes || null,
      created_by: userId ?? null,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment plan created", description: `${count} installments scheduled.` });
    setPlanOpen(false);
    setPlanForm({ ...planForm, installment_amount: "", notes: "" });
    load();
  };

  const addAdhoc = async () => {
    const amount = parseFloat(adhocForm.amount_due);
    if (isNaN(amount) || amount < 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { error } = await supabase.from("scheduled_payments").insert({
      case_id: caseId,
      due_date: adhocForm.due_date,
      amount_due: amount,
      notes: adhocForm.notes || null,
      created_by: userId ?? null,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setAdhocOpen(false);
    setAdhocForm({ due_date: new Date().toISOString().slice(0, 10), amount_due: "", notes: "" });
    load();
  };

  const markPaid = async (p: Payment) => {
    const { error } = await supabase.from("scheduled_payments")
      .update({ status: "paid", amount_paid: p.amount_due, paid_date: new Date().toISOString().slice(0, 10) })
      .eq("id", p.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const markMissed = async (p: Payment) => {
    const { error } = await supabase.from("scheduled_payments").update({ status: "missed" }).eq("id", p.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const removePayment = async (id: string) => {
    const { error } = await supabase.from("scheduled_payments").delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const totalDue = payments.reduce((s, p) => s + Number(p.amount_due), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
  const outstanding = totalDue - totalPaid;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Payment Arrangements</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdhocOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />One-off
            </Button>
            <Button size="sm" onClick={() => setPlanOpen(true)}>
              <CalendarClock className="h-3 w-3 mr-1" />New Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length > 0 && (
            <div className="space-y-2">
              {plans.map((pl) => (
                <div key={pl.id} className="p-3 rounded-md border bg-muted/30 text-sm flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {pl.installment_count} × ${Number(pl.installment_amount).toFixed(2)} <span className="text-muted-foreground capitalize">({pl.frequency})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Starts {format(new Date(pl.start_date), "MMM d, yyyy")} · Total ${Number(pl.total_amount).toFixed(2)}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{pl.status}</Badge>
                </div>
              ))}
            </div>
          )}

          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No scheduled payments yet</p>
          ) : (
            <>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                    <span className="text-muted-foreground w-24 shrink-0">{format(new Date(p.due_date), "MMM d, yyyy")}</span>
                    <Badge className={`${STATUS_COLOR[p.status]} text-[10px] capitalize shrink-0 border-0`}>{p.status}</Badge>
                    <span className="flex-1 truncate text-muted-foreground">
                      {p.payment_plan_id ? "Plan installment" : "One-off"}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </span>
                    <span className="font-mono font-medium">${Number(p.amount_due).toFixed(2)}</span>
                    <div className="flex gap-1 shrink-0">
                      {p.status !== "paid" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-status-success" onClick={() => markPaid(p)} title="Mark paid">
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      {p.status !== "missed" && p.status !== "paid" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-status-warning" onClick={() => markMissed(p)} title="Mark missed">
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePayment(p.id)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-6 pt-3 border-t text-sm">
                <div>Scheduled: <span className="font-mono font-medium">${totalDue.toFixed(2)}</span></div>
                <div>Paid: <span className="font-mono font-medium text-status-success">${totalPaid.toFixed(2)}</span></div>
                <div>Outstanding: <span className="font-mono font-medium">${outstanding.toFixed(2)}</span></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* New plan dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payment Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={planForm.frequency} onValueChange={(v: Plan["frequency"]) => setPlanForm({ ...planForm, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label># of installments</Label>
                <Input type="number" min={1} value={planForm.installment_count} onChange={(e) => setPlanForm({ ...planForm, installment_count: e.target.value })} />
              </div>
              <div>
                <Label>Amount per installment</Label>
                <Input type="number" step="0.01" min={0} value={planForm.installment_amount} onChange={(e) => setPlanForm({ ...planForm, installment_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={createPlan}>Create plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad-hoc dialog */}
      <Dialog open={adhocOpen} onOpenChange={setAdhocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Scheduled Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input type="date" value={adhocForm.due_date} onChange={(e) => setAdhocForm({ ...adhocForm, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.01" min={0} value={adhocForm.amount_due} onChange={(e) => setAdhocForm({ ...adhocForm, amount_due: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={adhocForm.notes} onChange={(e) => setAdhocForm({ ...adhocForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdhocOpen(false)}>Cancel</Button>
            <Button onClick={addAdhoc}>Add payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}