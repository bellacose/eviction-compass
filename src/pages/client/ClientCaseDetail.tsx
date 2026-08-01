import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Check, Circle, AlertCircle, MessageSquare, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NOTICE_KIND_LABELS, NOTICE_STATUS_LABELS, currency } from "@/lib/notices";

export default function ClientCaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [courtEvents, setCourtEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [caseRes, milestoneRes, notesRes, courtRes, docsRes, plansRes, paymentsRes, noticesRes] = await Promise.all([
        supabase.from("cases").select("*, properties(address_line1, city, state, zip), tenants(full_name)").eq("id", id).single(),
        supabase.from("case_milestones").select("*").eq("case_id", id).order("order_index"),
        supabase.from("case_notes").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }),
        supabase.from("court_events").select("*").eq("case_id", id).order("start_at"),
        supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
        supabase.from("payment_plans").select("*").eq("case_id", id).order("created_at", { ascending: false }),
        supabase.from("scheduled_payments").select("*").eq("case_id", id).order("due_date"),
        supabase.from("notices").select("*").eq("case_id", id).order("prepared_date", { ascending: false }),
      ]);
      setCaseData(caseRes.data);
      setMilestones(milestoneRes.data || []);
      setNotes(notesRes.data || []);
      setCourtEvents(courtRes.data || []);
      setDocuments(docsRes.data || []);
      setPlans(plansRes.data || []);
      setPayments(paymentsRes.data || []);
      setNotices(noticesRes.data || []);
    };
    load();
  }, [id]);

  const downloadDocument = async (doc: any) => {
    const { data, error } = await supabase.storage.from("case-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message || "Could not generate URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const requestUpdate = async () => {
    await supabase.from("notifications").insert({
      recipient_user_id: user?.id,
      case_id: id,
      title: "Update Requested",
      message: `Client requested an update on case.`,
      channel: "in_app",
    });
    toast({ title: "Update requested", description: "The admin team has been notified." });
  };

  if (!caseData) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const milestoneIcon = (status: string) => {
    switch (status) {
      case "complete": return <Check className="h-4 w-4 text-status-success" />;
      case "overdue": return <AlertCircle className="h-4 w-4 text-status-danger" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/client/cases"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{caseData.case_number}</h1>
            <StatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {(caseData.properties as any)?.address_line1}, {(caseData.properties as any)?.city} — {(caseData.tenants as any)?.full_name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={requestUpdate}>
          <MessageSquare className="h-3 w-3 mr-1" />Request Update
        </Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Case Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className="mt-0.5">{milestoneIcon(m.status)}</div>
                <div className="flex-1">
                  <span className={cn("text-sm font-medium", m.status === "complete" && "line-through text-muted-foreground")}>{m.label}</span>
                  <div className="text-xs text-muted-foreground">
                    {m.due_date && <span>Due: {format(new Date(m.due_date), "MMM d, yyyy")} </span>}
                    {m.completed_at && <span>✓ {format(new Date(m.completed_at), "MMM d, yyyy")}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Court Events */}
      {notices.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{NOTICE_KIND_LABELS[n.notice_kind] ?? n.notice_kind}</span>
                  <Badge variant="outline" className="text-[10px]">{NOTICE_STATUS_LABELS[n.status] ?? n.status}</Badge>
                  <span className="ml-auto font-mono">{currency(n.amount_demanded)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {n.served_date
                    ? `Served ${format(new Date(n.served_date), "MMM d, yyyy")}`
                    : `Prepared ${format(new Date(n.prepared_date), "MMM d, yyyy")}`}
                  {n.cure_by_date && ` · Cure by ${format(new Date(n.cure_by_date), "MMM d, yyyy")}`}
                  {n.eligible_to_file_date && ` · Filing eligible ${format(new Date(n.eligible_to_file_date), "MMM d, yyyy")}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {courtEvents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Court Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {courtEvents.map((e) => (
              <div key={e.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{e.event_type}</Badge>
                  <span className="font-medium">{e.court_name}</span>
                </div>
                {e.start_at && <div className="text-muted-foreground mt-1">{format(new Date(e.start_at), "MMM d, yyyy 'at' h:mm a")}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment Arrangements */}
      {(plans.length > 0 || payments.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Payment Arrangements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {plans.map((pl) => (
              <div key={pl.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="font-medium">
                  {pl.installment_count} × ${Number(pl.installment_amount).toFixed(2)} <span className="text-muted-foreground capitalize">({pl.frequency})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Starts {format(new Date(pl.start_date), "MMM d, yyyy")} · Total ${Number(pl.total_amount).toFixed(2)}
                </div>
              </div>
            ))}
            {payments.length > 0 && (
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                    <span className="text-muted-foreground w-24 shrink-0">{format(new Date(p.due_date), "MMM d, yyyy")}</span>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{p.status}</Badge>
                    <span className="flex-1 truncate text-muted-foreground">{p.notes || (p.payment_plan_id ? "Plan installment" : "One-off")}</span>
                    <span className="font-mono font-medium">${Number(p.amount_due).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex-1 min-w-0">
                  <span>{d.file_name}</span>
                  {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="outline" className="text-xs">{d.category}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(d)} title="Download">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Updates */}
      {notes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Updates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-xs">{(n.profiles as any)?.full_name}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, h:mm a")}</span>
                </div>
                <p>{n.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
