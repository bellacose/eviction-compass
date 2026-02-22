import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Check, Circle, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ClientCaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [courtEvents, setCourtEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [caseRes, milestoneRes, notesRes, courtRes, docsRes] = await Promise.all([
        supabase.from("cases").select("*, properties(address_line1, city, state, zip), tenants(full_name)").eq("id", id).single(),
        supabase.from("case_milestones").select("*").eq("case_id", id).order("order_index"),
        supabase.from("case_notes").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }),
        supabase.from("court_events").select("*").eq("case_id", id).order("start_at"),
        supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      ]);
      setCaseData(caseRes.data);
      setMilestones(milestoneRes.data || []);
      setNotes(notesRes.data || []);
      setCourtEvents(courtRes.data || []);
      setDocuments(docsRes.data || []);
    };
    load();
  }, [id]);

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

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span>{d.file_name}</span>
                <Badge variant="outline" className="text-xs">{d.category}</Badge>
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
