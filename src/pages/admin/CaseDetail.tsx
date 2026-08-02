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
import { ArrowLeft, Check, Circle, AlertCircle, Clock, SkipForward, Upload, Send, Plus, Pencil, Trash2, Download, Eye, EyeOff, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CourtEventDialog from "@/components/admin/CourtEventDialog";
import ServiceRecordDialog from "@/components/admin/ServiceRecordDialog";
import PaymentPlanPanel from "@/components/admin/PaymentPlanPanel";
import NoticesPanel from "@/components/admin/NoticesPanel";
import NextActionPanel from "@/components/matter/NextActionPanel";
import MatterActionsPanel from "@/components/matter/MatterActionsPanel";
import MatterHoldPanel from "@/components/matter/MatterHoldPanel";
import MatterEligibilityPanel from "@/components/matter/MatterEligibilityPanel";
import ReferralPacketPanel from "@/components/matter/ReferralPacketPanel";

const DOCUMENT_CATEGORIES = ["lease", "rent_ledger", "notice", "proof_of_service", "petition_filing", "court_document", "photo", "correspondence", "other"] as const;

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
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [workflowKey, setWorkflowKey] = useState(0);
  
  // Ledger dialog state
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<any>(null);
  const [ledgerForm, setLedgerForm] = useState({ entry_date: "", charge_type: "rent", description: "", amount: "" });
  const [deleteLedgerId, setDeleteLedgerId] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<"internal" | "client_update">("internal");
  const [loading, setLoading] = useState(true);

  // Court event dialog state
  const [courtDialogOpen, setCourtDialogOpen] = useState(false);
  const [editingCourtEvent, setEditingCourtEvent] = useState<any>(null);
  const [courtSaving, setCourtSaving] = useState(false);
  const [deleteCourtId, setDeleteCourtId] = useState<string | null>(null);

  // Service record dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingServiceRecord, setEditingServiceRecord] = useState<any>(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    const [caseRes, milestoneRes, notesRes, courtRes, docsRes, serviceRes, activityRes, ledgerRes] = await Promise.all([
      supabase.from("cases").select("*, clients(company_name, contact_name, email, phone), tenants(full_name, phone, email), properties(address_line1, address_line2, city, state, zip, county)").eq("id", id).single(),
      supabase.from("case_milestones").select("*").eq("case_id", id).order("order_index"),
      supabase.from("case_notes").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("court_events").select("*").eq("case_id", id).order("start_at"),
      supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("service_records").select("*").eq("case_id", id).order("service_date"),
      supabase.from("activity_log").select("*, profiles(full_name)").eq("case_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("ledger_entries").select("*").eq("case_id", id).order("entry_date", { ascending: true }),
    ]);
    setCaseData(caseRes.data);
    setMilestones(milestoneRes.data || []);
    setNotes(notesRes.data || []);
    setCourtEvents(courtRes.data || []);
    setDocuments(docsRes.data || []);
    setServiceRecords(serviceRes.data || []);
    setActivity(activityRes.data || []);
    setLedgerEntries((ledgerRes as any).data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const completeMilestone = async (milestoneId: string) => {
    await supabase.from("case_milestones").update({ status: "complete", completed_at: new Date().toISOString(), completed_by: user?.id }).eq("id", milestoneId);
    toast({ title: "Milestone completed" });
    load();
  };

  // Status changes flow exclusively through the transition service (Bible §4.5).

  const addNote = async () => {
    if (!newNote.trim()) return;
    await supabase.from("case_notes").insert({ case_id: id, note_type: noteType, content: newNote, created_by: user?.id });
    setNewNote("");
    toast({ title: noteType === "internal" ? "Internal note added" : "Client update posted" });
    load();
  };

  // --- Court Events CRUD ---
  const saveCourtEvent = async (data: any) => {
    setCourtSaving(true);
    if (editingCourtEvent) {
      const { error } = await supabase.from("court_events").update(data).eq("id", editingCourtEvent.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Court event updated" }); }
    } else {
      const { error } = await supabase.from("court_events").insert({ ...data, case_id: id, created_by: user?.id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Court event added" }); }
    }
    setCourtSaving(false);
    setCourtDialogOpen(false);
    setEditingCourtEvent(null);
    load();
  };

  const deleteCourtEvent = async () => {
    if (!deleteCourtId) return;
    await supabase.from("court_events").delete().eq("id", deleteCourtId);
    toast({ title: "Court event deleted" });
    setDeleteCourtId(null);
    load();
  };

  // --- Service Records CRUD ---
  const saveServiceRecord = async (data: any) => {
    setServiceSaving(true);
    if (editingServiceRecord) {
      const { error } = await supabase.from("service_records").update(data).eq("id", editingServiceRecord.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Service record updated" }); }
    } else {
      const { error } = await supabase.from("service_records").insert({ ...data, case_id: id });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Service record added" }); }
    }
    setServiceSaving(false);
    setServiceDialogOpen(false);
    setEditingServiceRecord(null);
    load();
  };

  const deleteServiceRecord = async () => {
    if (!deleteServiceId) return;
    await supabase.from("service_records").delete().eq("id", deleteServiceId);
    toast({ title: "Service record deleted" });
    setDeleteServiceId(null);
    load();
  };

  // --- Document actions ---
  const handleUpload = async () => {
    if (!uploadFile || !caseData) return;
    setUploading(true);
    const filePath = `client/${caseData.client_id}/case/${id}/${uploadCategory}/${Date.now()}_${uploadFile.name}`;
    const { error: uploadError } = await supabase.storage.from("case-documents").upload(filePath, uploadFile);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    await supabase.from("documents").insert({
      case_id: id, file_name: uploadFile.name, file_path: filePath, mime_type: uploadFile.type,
      file_size: uploadFile.size, uploaded_by: user?.id, category: uploadCategory as any,
      description: uploadDescription || null, visible_to_client: uploadVisible,
    });
    toast({ title: "Document uploaded" });
    setUploading(false);
    setUploadDialogOpen(false);
    setUploadFile(null);
    setUploadCategory("other");
    setUploadDescription("");
    setUploadVisible(false);
    load();
  };

  const downloadDocument = async (doc: any) => {
    const { data, error } = await supabase.storage.from("case-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message || "Could not generate URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const toggleVisibility = async (doc: any) => {
    await supabase.from("documents").update({ visible_to_client: !doc.visible_to_client }).eq("id", doc.id);
    toast({ title: doc.visible_to_client ? "Hidden from client" : "Visible to client" });
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

      {/* Workflow */}
      <div className="grid gap-4 md:grid-cols-2">
        <NextActionPanel caseId={id!} status={caseData.status} refreshKey={workflowKey} onChanged={load} />
        <div className="space-y-4">
          <MatterActionsPanel caseId={id!} status={caseData.status} onChanged={() => { setWorkflowKey((k) => k + 1); load(); }} />
          <MatterHoldPanel caseId={id!} onChanged={() => { setWorkflowKey((k) => k + 1); load(); }} />
          <MatterEligibilityPanel caseId={id!} onChanged={() => { setWorkflowKey((k) => k + 1); load(); }} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {nextPending && (
            <Button size="sm" onClick={() => completeMilestone(nextPending.id)}>
              <Check className="h-3 w-3 mr-1" />Complete: {nextPending.label}
            </Button>
          )}
          {caseData.court_name && (
            <span className="text-sm text-muted-foreground">Court: {caseData.court_name}</span>
          )}
          <Button size="sm" variant="outline" asChild className="ml-auto">
            <Link to={`/admin/collections/new?case_id=${id}`}>Send to Collections</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="referral">Referral</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="court">Court</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
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
                {(caseData.properties as any)?.county && <div className="text-muted-foreground text-xs">{(caseData.properties as any)?.county} County</div>}
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

        {/* Notices Tab */}
        <TabsContent value="notices">
          <NoticesPanel caseId={id!} userId={user?.id} />
        </TabsContent>

        <TabsContent value="referral">
          <ReferralPacketPanel caseId={id!} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Documents</CardTitle>
              <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-3 w-3 mr-1" />Upload
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{d.file_name}</span>
                        {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                          {d.visible_to_client && <Badge variant="outline" className="text-[10px] border-status-success text-status-success">Client visible</Badge>}
                          <span>{d.created_at && format(new Date(d.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(d)} title={d.visible_to_client ? "Hide from client" : "Show to client"}>
                          {d.visible_to_client ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(d)} title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Service Records</CardTitle>
              <Button size="sm" onClick={() => { setEditingServiceRecord(null); setServiceDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" />Add Record
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {serviceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No service records</p>
              ) : (
                <div className="space-y-3">
                  {serviceRecords.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{s.notice_type}</div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingServiceRecord(s); setServiceDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteServiceId(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-muted-foreground">Method: {s.service_method?.replace("_", " ")} | Date: {s.service_date ? format(new Date(s.service_date), "MMM d, yyyy") : "—"}</div>
                      {s.served_by && <div className="text-muted-foreground">Served by: {s.served_by}</div>}
                      {s.mailing_tracking_number && <div className="text-muted-foreground">Tracking: {s.mailing_tracking_number}</div>}
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
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Court Events</CardTitle>
              <Button size="sm" onClick={() => { setEditingCourtEvent(null); setCourtDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" />Add Event
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {courtEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No court events</p>
              ) : (
                <div className="space-y-3">
                  {courtEvents.map((e) => (
                    <div key={e.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize text-xs">{e.event_type}</Badge>
                          <span className="font-medium">{e.court_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCourtEvent(e); setCourtDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCourtId(e.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {e.start_at && <div className="text-muted-foreground">{format(new Date(e.start_at), "MMM d, yyyy 'at' h:mm a")}</div>}
                      {e.location && <div className="text-muted-foreground">{e.location}</div>}
                      {e.virtual_link && <div><a href={e.virtual_link} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">Virtual Link</a></div>}
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

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Rent & Late Fee Ledger</CardTitle>
              <Button size="sm" onClick={() => { setEditingLedger(null); setLedgerForm({ entry_date: new Date().toISOString().slice(0, 10), charge_type: "rent", description: "", amount: "" }); setLedgerDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" />Add Entry
              </Button>
            </CardHeader>
            <CardContent>
              {ledgerEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No ledger entries yet</p>
              ) : (
                <>
                  <div className="space-y-1">
                    {ledgerEntries.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground w-24 shrink-0">{format(new Date(e.entry_date), "MMM d, yyyy")}</span>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.charge_type.replace("_", " ")}</Badge>
                        <span className="flex-1 truncate">{e.description || "—"}</span>
                        <span className="font-mono font-medium">${Number(e.amount).toFixed(2)}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLedger(e); setLedgerForm({ entry_date: e.entry_date, charge_type: e.charge_type, description: e.description || "", amount: String(e.amount) }); setLedgerDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteLedgerId(e.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-3 border-t mt-3">
                    <div className="text-sm font-medium">Total Owed: <span className="font-mono text-base">${ledgerEntries.reduce((sum: number, e: any) => sum + Number(e.amount), 0).toFixed(2)}</span></div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <PaymentPlanPanel caseId={id!} userId={user?.id} />
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

      {/* Court Event Dialog */}
      <CourtEventDialog
        open={courtDialogOpen}
        onOpenChange={(open) => { setCourtDialogOpen(open); if (!open) setEditingCourtEvent(null); }}
        onSave={saveCourtEvent}
        initialData={editingCourtEvent}
        saving={courtSaving}
      />

      {/* Service Record Dialog */}
      <ServiceRecordDialog
        open={serviceDialogOpen}
        onOpenChange={(open) => { setServiceDialogOpen(open); if (!open) setEditingServiceRecord(null); }}
        onSave={saveServiceRecord}
        initialData={editingServiceRecord}
        saving={serviceSaving}
      />

      {/* Delete Court Event Confirmation */}
      <AlertDialog open={!!deleteCourtId} onOpenChange={() => setDeleteCourtId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Court Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCourtEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Service Record Confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteServiceRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ledger Entry Dialog */}
      <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingLedger ? "Edit" : "Add"} Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" className="h-9 text-sm" value={ledgerForm.entry_date} onChange={(e) => setLedgerForm({ ...ledgerForm, entry_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={ledgerForm.charge_type} onValueChange={(v) => setLedgerForm({ ...ledgerForm, charge_type: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" step="0.01" min="0" className="h-9 text-sm" value={ledgerForm.amount} onChange={(e) => setLedgerForm({ ...ledgerForm, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input className="h-9 text-sm" value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLedgerDialogOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!ledgerForm.amount || !ledgerForm.entry_date} onClick={async () => {
              const payload = { case_id: id, entry_date: ledgerForm.entry_date, charge_type: ledgerForm.charge_type, amount: parseFloat(ledgerForm.amount), description: ledgerForm.description || null, created_by: user?.id };
              if (editingLedger) {
                const { error } = await supabase.from("ledger_entries").update(payload).eq("id", editingLedger.id);
                if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                toast({ title: "Entry updated" });
              } else {
                const { error } = await supabase.from("ledger_entries").insert(payload);
                if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                toast({ title: "Entry added" });
              }
              setLedgerDialogOpen(false);
              load();
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Ledger Entry Confirmation */}
      <AlertDialog open={!!deleteLedgerId} onOpenChange={() => setDeleteLedgerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ledger Entry</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await supabase.from("ledger_entries").delete().eq("id", deleteLedgerId); toast({ title: "Entry deleted" }); setDeleteLedgerId(null); load(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">File</Label>
              <Input type="file" className="text-sm" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input className="h-9 text-sm" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="visible-toggle" checked={uploadVisible} onChange={(e) => setUploadVisible(e.target.checked)} className="rounded" />
              <Label htmlFor="visible-toggle" className="text-xs cursor-pointer">Visible to client</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUpload} disabled={!uploadFile || uploading}>{uploading ? "Uploading…" : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
