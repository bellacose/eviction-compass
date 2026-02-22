import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_LABELS, MILESTONE_STATUS_COLORS } from "@/lib/case-utils";
import { ArrowLeft, Check, Circle, AlertCircle, Clock, SkipForward, Upload, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [courtEvents, setCourtEvents] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"internal" | "client_update">("internal");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const [caseRes, milestoneRes, notesRes, courtRes, docsRes, serviceRes, activityRes] = await Promise.all([
      supabase.from("cases").select("*, clients(company_name, contact_name, email, phone), tenants(full_name, phone, email), properties(address_line1, address_line2, city, state, zip, county)").eq("id", id).single(),
      supabase.from("case_milestones").select("*").eq("case_id", id).order("order_index"),
      supabase.from("case_notes").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("court_events").select("*").eq("case_id", id).order("start_at"),
      supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("service_records").select("*").eq("case_id", id).order("service_date"),
      supabase.from("activity_log").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    setCaseData(caseRes.data);
    setMilestones(milestoneRes.data || []);
    setNotes(notesRes.data || []);
    setCourtEvents(courtRes.data || []);
    setDocuments(docsRes.data || []);
    setServiceRecords(serviceRes.data || []);
    setActivity(activityRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const completeMilestone = async (milestoneId: string) => {
    await supabase.from("case_milestones").update({ status: "complete", completed_at: new Date().toISOString(), completed_by: user?.id }).eq("id", milestoneId);
    toast({ title: "Milestone completed" });
    load();
  };

  const updateStatus = async (newStatus: string) => {
    await supabase.from("cases").update({ status: newStatus as any }).eq("id", id);
    toast({ title: "Status updated" });
    load();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    await supabase.from("case_notes").insert({ case_id: id, note_type: noteType, content: newNote, created_by: user?.id });
    if (noteType === "client_update" && caseData) {
      // Create notification for client users (simplified)
    }
    setNewNote("");
    toast({ title: noteType === "internal" ? "Internal note added" : "Client update posted" });
    load();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseData) return;
    const filePath = `client/${caseData.client_id}/case/${id}/other/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("case-documents").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    await supabase.from("documents").insert({
      case_id: id, file_name: file.name, file_path: filePath, mime_type: file.type,
      file_size: file.size, uploaded_by: user?.id, category: "other",
    });
    toast({ title: "Document uploaded" });
    load();
  };

  if (loading) return <div className="p-8 text-muted-foreground">Loading case…</div>;
  if (!caseData) return <div className="p-8 text-muted-foreground">Case not found</div>;

  const nextPending = milestones.find((m) => m.status === "pending" || m.status === "overdue");

  const milestoneIcon = (status: string) => {
    switch (status) {
      case "complete": return <Check className="h-4 w-4 text-status-success" />;
      case "overdue": return <AlertCircle className="h-4 w-4 text-status-danger" />;
      case "skipped": return <SkipForward className="h-4 w-4 text-status-neutral" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/cases"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{caseData.case_number}</h1>
            <StatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-muted-foreground">{(caseData.clients as any)?.company_name} — {(caseData.tenants as any)?.full_name}</p>
        </div>
      </div>

      {/* Status bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={caseData.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {nextPending && (
            <Button size="sm" onClick={() => completeMilestone(nextPending.id)}>
              <Check className="h-3 w-3 mr-1" />Complete: {nextPending.label}
            </Button>
          )}
          {caseData.court_name && (
            <span className="text-sm text-muted-foreground">Court: {caseData.court_name}</span>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="court">Court</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Case Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Case Type</span><span className="capitalize">{caseData.case_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Jurisdiction</span><span>{caseData.jurisdiction_county}, {caseData.jurisdiction_state}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opened</span><span>{format(new Date(caseData.opened_date), "MMM d, yyyy")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className="capitalize">{caseData.priority}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Client</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{(caseData.clients as any)?.company_name}</div>
                <div className="text-muted-foreground">{(caseData.clients as any)?.contact_name}</div>
                <div className="text-muted-foreground">{(caseData.clients as any)?.email}</div>
                <div className="text-muted-foreground">{(caseData.clients as any)?.phone}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Property</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <div>{(caseData.properties as any)?.address_line1}</div>
                {(caseData.properties as any)?.address_line2 && <div>{(caseData.properties as any)?.address_line2}</div>}
                <div className="text-muted-foreground">{(caseData.properties as any)?.city}, {(caseData.properties as any)?.state} {(caseData.properties as any)?.zip}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Tenant</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{(caseData.tenants as any)?.full_name}</div>
                <div className="text-muted-foreground">{(caseData.tenants as any)?.phone}</div>
                <div className="text-muted-foreground">{(caseData.tenants as any)?.email}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-1">
                {milestones.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                    <div className="mt-0.5">{milestoneIcon(m.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", m.status === "complete" && "line-through text-muted-foreground")}>{m.label}</span>
                        {m.status === "overdue" && <Badge variant="destructive" className="text-[10px] px-1.5">OVERDUE</Badge>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {m.due_date && <span>Due: {format(new Date(m.due_date), "MMM d, yyyy")}</span>}
                        {m.completed_at && <span>Done: {format(new Date(m.completed_at), "MMM d, yyyy")}</span>}
                        {!m.client_visible && <Badge variant="outline" className="text-[10px] px-1">Internal</Badge>}
                      </div>
                    </div>
                    {(m.status === "pending" || m.status === "overdue") && (
                      <Button size="sm" variant="outline" onClick={() => completeMilestone(m.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Documents</CardTitle>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  <Upload className="h-3 w-3" />Upload
                </div>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
              </Label>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span className="text-sm font-medium">{d.file_name}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                          {d.visible_to_client && <Badge variant="outline" className="text-[10px] border-status-success text-status-success">Client visible</Badge>}
                          <span>{d.created_at && format(new Date(d.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Tab */}
        <TabsContent value="service">
          <Card>
            <CardContent className="p-4">
              {serviceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No service records</p>
              ) : (
                <div className="space-y-3">
                  {serviceRecords.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="font-medium">{s.notice_type}</div>
                      <div className="text-muted-foreground">Method: {s.service_method} | Date: {s.service_date ? format(new Date(s.service_date), "MMM d, yyyy") : "—"}</div>
                      {s.served_by && <div className="text-muted-foreground">Served by: {s.served_by}</div>}
                      {s.notes && <div className="text-muted-foreground">{s.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Court Tab */}
        <TabsContent value="court">
          <Card>
            <CardContent className="p-4">
              {courtEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No court events</p>
              ) : (
                <div className="space-y-3">
                  {courtEvents.map((e) => (
                    <div key={e.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{e.event_type}</Badge>
                        <span className="font-medium">{e.court_name}</span>
                      </div>
                      {e.start_at && <div className="text-muted-foreground">{format(new Date(e.start_at), "MMM d, yyyy 'at' h:mm a")}</div>}
                      {e.location && <div className="text-muted-foreground">{e.location}</div>}
                      {e.outcome && <div>Outcome: {e.outcome}</div>}
                      {e.notes && <div className="text-muted-foreground">{e.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={noteType} onValueChange={(v) => setNoteType(v as any)}>
                    <SelectTrigger className="w-[160px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Note</SelectItem>
                      <SelectItem value="client_update">Client Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder={noteType === "internal" ? "Add internal note…" : "Post update visible to client…"} value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} />
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                  <Send className="h-3 w-3 mr-1" />Post {noteType === "client_update" ? "Client Update" : "Note"}
                </Button>
              </div>
              <div className="border-t pt-4 space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className={cn("p-3 rounded-lg text-sm", n.note_type === "client_update" ? "bg-primary/5 border border-primary/20" : "bg-muted/50")}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">{(n.profiles as any)?.full_name || "System"}</span>
                      <Badge variant="outline" className="text-[10px]">{n.note_type === "client_update" ? "Client Update" : "Internal"}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, h:mm a")}</span>
                    </div>
                    <p>{n.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0 text-sm">
                      <Clock className="h-3.5 w-3.5 mt-1 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{(a.profiles as any)?.full_name || "System"}</span>
                        <span className="text-muted-foreground"> {a.action_type} </span>
                        <span className="text-muted-foreground">{a.entity_type}</span>
                        <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy h:mm a")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
