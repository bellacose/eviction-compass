import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, Plus, Download, Stamp, RefreshCw } from "lucide-react";
import { logMatterEvent } from "@/lib/matter";
import {
  NOTICE_KINDS,
  NOTICE_KIND_LABELS,
  NOTICE_STATUSES,
  NOTICE_STATUS_LABELS,
  SERVICE_METHODS,
  buildMergeData,
  currency,
  ledgerBalanceAsOf,
  loadNoticeTemplates,
  noticeToHtml,
  renderTemplate,
} from "@/lib/notices";

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  caseId: string;
  userId?: string;
  onTimelineChange?: () => void;
}

export default function NoticesPanel({ caseId, userId, onTimelineChange }: Props) {
  const { toast } = useToast();
  const [notices, setNotices] = useState<any[]>([]);
  const [caseRow, setCaseRow] = useState<any>(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    notice_kind: "fourteen_day_demand",
    prepared_date: today(),
    period_through: today(),
    amount_demanded: "0",
    amount_overridden: false,
    notes: "",
  });
  const [computed, setComputed] = useState(0);

  const [serveFor, setServeFor] = useState<any>(null);
  const [serveForm, setServeForm] = useState({ served_date: today(), service_method: "personal", served_by: "" });

  const load = useCallback(async () => {
    const [noticeRes, caseRes] = await Promise.all([
      supabase.from("notices").select("*").eq("case_id", caseId).order("prepared_date", { ascending: false }),
      supabase
        .from("cases")
        .select("*, clients(company_name, address_line1, city, state, zip), properties(address_line1, city, state, zip), units(unit_number), tenants(full_name)")
        .eq("id", caseId)
        .maybeSingle(),
    ]);
    setNotices(noticeRes.data || []);
    setCaseRow(caseRes.data);
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    load();
    loadNoticeTemplates().then(setTemplates);
  }, [load]);

  const refreshComputed = useCallback(
    async (asOf: string) => {
      const bal = await ledgerBalanceAsOf(caseId, asOf);
      setComputed(bal);
      setForm((f) => (f.amount_overridden ? f : { ...f, amount_demanded: bal.toFixed(2) }));
    },
    [caseId],
  );

  const openCreate = async () => {
    const d = today();
    setForm({
      notice_kind: "fourteen_day_demand",
      prepared_date: d,
      period_through: d,
      amount_demanded: "0",
      amount_overridden: false,
      notes: "",
    });
    setCreateOpen(true);
    await refreshComputed(d);
  };

  const createNotice = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("notices")
      .insert({
        case_id: caseId,
        notice_kind: form.notice_kind as any,
        status: "issued",
        prepared_date: form.prepared_date,
        period_through: form.period_through,
        amount_demanded: Number(form.amount_demanded || 0),
        computed_amount: computed,
        amount_overridden: form.amount_overridden,
        notes: form.notes || null,
        prepared_by: userId ?? null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not create notice", description: error.message, variant: "destructive" });
      return;
    }
    await logMatterEvent({
      caseId,
      eventKey: "notice_created",
      label: `${NOTICE_KIND_LABELS[form.notice_kind]} prepared`,
      detail: `${currency(form.amount_demanded)} demanded through ${form.period_through}`,
    });
    setCreateOpen(false);
    onTimelineChange?.();
    await load();
    if (data) await generateDocument(data, false);
  };

  const recordService = async () => {
    if (!serveFor) return;
    setSaving(true);
    const { error } = await supabase
      .from("notices")
      .update({
        served_date: serveForm.served_date,
        service_method: serveForm.service_method as any,
        status: "cure_running",
      })
      .eq("id", serveFor.id);
    if (!error) {
      await supabase.from("service_records").insert({
        case_id: caseId,
        notice_id: serveFor.id,
        notice_type: NOTICE_KIND_LABELS[serveFor.notice_kind],
        service_method: serveForm.service_method as any,
        service_date: serveForm.served_date,
        served_by: serveForm.served_by || null,
      });
      await logMatterEvent({
        caseId,
        eventKey: "notice_served",
        label: `${NOTICE_KIND_LABELS[serveFor.notice_kind]} served`,
        detail: `${SERVICE_METHODS.find((s) => s.value === serveForm.service_method)?.label} on ${serveForm.served_date}`,
      });
      onTimelineChange?.();
    }
    setSaving(false);
    if (error) {
      toast({ title: "Could not record service", description: error.message, variant: "destructive" });
      return;
    }
    setServeFor(null);
    await load();
  };

  const setStatus = async (notice: any, status: string) => {
    const { error } = await supabase.from("notices").update({ status: status as any }).eq("id", notice.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  const renderBody = (notice: any) => {
    const template = templates[notice.notice_kind] || "";
    return renderTemplate(template, buildMergeData({ caseRow, notice }));
  };

  /** Renders the notice, stores it in the private bucket and links it to the notice row. */
  const generateDocument = async (notice: any, announce = true) => {
    if (!caseRow) return;
    const body = renderBody(notice);
    const html = noticeToHtml(NOTICE_KIND_LABELS[notice.notice_kind], body);
    const fileName = `${NOTICE_KIND_LABELS[notice.notice_kind].replace(/\s+/g, "-").toLowerCase()}-${notice.prepared_date}.html`;
    const filePath = `${caseId}/notices/${notice.id}.html`;
    const blob = new Blob([html], { type: "text/html" });

    const { error: upErr } = await supabase.storage.from("case-documents").upload(filePath, blob, { upsert: true });
    if (upErr) {
      if (announce) toast({ title: "Generation failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        case_id: caseId,
        category: "notice",
        file_name: fileName,
        file_path: filePath,
        mime_type: "text/html",
        file_size: blob.size,
        uploaded_by: userId ?? null,
        visible_to_client: true,
        description: `${NOTICE_KIND_LABELS[notice.notice_kind]} — ${currency(notice.amount_demanded)}`,
      })
      .select()
      .single();
    if (docErr) {
      if (announce) toast({ title: "Generation failed", description: docErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("notices").update({ document_id: doc.id }).eq("id", notice.id);
    if (announce) toast({ title: "Notice generated", description: fileName });
    await load();
  };

  const download = async (notice: any) => {
    if (!notice.document_id) {
      await generateDocument(notice);
      return;
    }
    const { data: doc } = await supabase.from("documents").select("file_path").eq("id", notice.document_id).maybeSingle();
    if (!doc) return;
    const { data, error } = await supabase.storage.from("case-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const [previewFor, setPreviewFor] = useState<any>(null);
  const previewText = useMemo(() => (previewFor ? renderBody(previewFor) : ""), [previewFor, templates, caseRow]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Notices &amp; Deadlines</CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="h-3 w-3 mr-1" />New Notice</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notices yet. Create a 5-day late notice or 14-day demand to start the statutory clock.</p>
        ) : (
          notices.map((n) => (
            <div key={n.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{NOTICE_KIND_LABELS[n.notice_kind]}</span>
                <Badge variant="outline" className="text-[10px]">{NOTICE_STATUS_LABELS[n.status]}</Badge>
                <span className="font-mono text-sm ml-auto">{currency(n.amount_demanded)}</span>
              </div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-xs text-muted-foreground">
                <span>Prepared {n.prepared_date ? format(new Date(n.prepared_date), "MMM d, yyyy") : "—"}</span>
                <span>Through {n.period_through ? format(new Date(n.period_through), "MMM d, yyyy") : "—"}</span>
                <span>
                  Served{" "}
                  {n.served_date
                    ? `${format(new Date(n.served_date), "MMM d, yyyy")} · ${SERVICE_METHODS.find((s) => s.value === n.service_method)?.label ?? n.service_method}`
                    : "not yet"}
                </span>
                <span>
                  {n.amount_overridden && n.computed_amount != null
                    ? `Overridden (ledger: ${currency(n.computed_amount)})`
                    : "Amount from rent ledger"}
                </span>
                <span className={n.cure_by_date ? "text-foreground" : ""}>
                  Cure by {n.cure_by_date ? format(new Date(n.cure_by_date), "MMM d, yyyy") : "—"}
                </span>
                <span className={n.eligible_to_file_date ? "text-foreground" : ""}>
                  Proposed eligible to file {n.eligible_to_file_date ? format(new Date(n.eligible_to_file_date), "MMM d, yyyy") : "—"}
                </span>
              </div>
              {n.notes && <p className="text-xs">{n.notes}</p>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setServeFor(n)}>
                  <Stamp className="h-3 w-3 mr-1" />{n.served_date ? "Update Service" : "Record Service"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewFor(n)}>Preview</Button>
                <Button size="sm" variant="outline" onClick={() => download(n)}>
                  <Download className="h-3 w-3 mr-1" />Document
                </Button>
                <Button size="sm" variant="ghost" onClick={() => generateDocument(n)} title="Regenerate document">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Select value={n.status} onValueChange={(v) => setStatus(n, v)}>
                  <SelectTrigger className="h-8 w-[190px] ml-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Notice type</Label>
              <Select value={form.notice_kind} onValueChange={(v) => setForm({ ...form, notice_kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prepared date</Label>
                <Input type="date" value={form.prepared_date} onChange={(e) => setForm({ ...form, prepared_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rent owed through</Label>
                <Input
                  type="date"
                  value={form.period_through}
                  onChange={(e) => {
                    setForm({ ...form, period_through: e.target.value });
                    refreshComputed(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount demanded</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount_demanded}
                onChange={(e) => setForm({ ...form, amount_demanded: e.target.value, amount_overridden: true })}
              />
              <p className="text-xs text-muted-foreground">Ledger balance through {form.period_through}: {currency(computed)}</p>
              {form.amount_overridden && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={form.amount_overridden}
                    onCheckedChange={(c) => {
                      const overridden = c === true;
                      setForm((f) => ({
                        ...f,
                        amount_overridden: overridden,
                        amount_demanded: overridden ? f.amount_demanded : computed.toFixed(2),
                      }));
                    }}
                  />
                  Manual override (uncheck to use the ledger total)
                </label>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createNotice} disabled={saving || Number(form.amount_demanded) < 0}>
              {saving ? "Creating…" : "Create & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record service */}
      <Dialog open={!!serveFor} onOpenChange={(o) => !o && setServeFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Service date</Label>
              <Input type="date" value={serveForm.served_date} onChange={(e) => setServeForm({ ...serveForm, served_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Service method</Label>
              <Select value={serveForm.service_method} onValueChange={(v) => setServeForm({ ...serveForm, service_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_METHODS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Served by</Label>
              <Input value={serveForm.served_by} onChange={(e) => setServeForm({ ...serveForm, served_by: e.target.value })} placeholder="Process server or staff name" />
            </div>
            <p className="text-xs text-muted-foreground">
              Cure-by and eligible-to-file dates are calculated automatically from the jurisdiction rule for this notice type.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServeFor(null)}>Cancel</Button>
            <Button onClick={recordService} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewFor} onOpenChange={(o) => !o && setPreviewFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{previewFor ? NOTICE_KIND_LABELS[previewFor.notice_kind] : "Preview"}</DialogTitle></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm font-serif">{previewText}</pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFor(null)}>Close</Button>
            {previewFor && <Button onClick={() => download(previewFor)}>Download</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
