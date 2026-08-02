import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock } from "lucide-react";

export default function AttorneyMatterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [matter, setMatter] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase
      .from("cases")
      .select("*, properties(*), tenants:primary_tenant_id(*), clients(company_name)")
      .eq("id", id)
      .maybeSingle();

    if (!c) {
      setDenied(true);
      setLoading(false);
      return;
    }
    setMatter(c);

    const [n, l, d, no, t] = await Promise.all([
      supabase.from("notices").select("*").eq("case_id", id).order("prepared_date", { ascending: false }),
      supabase.from("ledger_entries").select("*").eq("case_id", id).order("entry_date"),
      supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("case_notes").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("case_id", id).order("created_at", { ascending: false }),
    ]);
    setNotices(n.data || []);
    setLedger(l.data || []);
    setDocuments(d.data || []);
    setNotes(no.data || []);
    setTasks(t.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    const { error } = await supabase
      .from("case_notes")
      .insert({ case_id: id, note_type: "internal", content: newNote.trim(), created_by: user?.id });
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
      return;
    }
    setNewNote("");
    load();
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  if (denied || !matter) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto opacity-30" />
          <p className="font-medium">This matter is not assigned to you</p>
          <p className="text-sm text-muted-foreground">
            Access is granted per assignment. Ask the firm's administrator to assign it to you.
          </p>
          <Button asChild variant="outline" size="sm"><Link to="/attorney/matters">Back to matters</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const balance = ledger.reduce(
    (s, e) => s + Number(e.amount || 0) - Number(e.payment_amount || 0) - Number(e.credit_amount || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/attorney/matters"><ArrowLeft className="h-4 w-4 mr-1" />Matters</Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{matter.case_number}</h1>
          <p className="text-sm text-muted-foreground">
            {matter.clients?.company_name} · {matter.jurisdiction_county}, {matter.jurisdiction_state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {matter.is_on_hold && <Badge variant="destructive">On hold</Badge>}
          <StatusBadge status={matter.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tenant</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{matter.tenants?.full_name || "—"}</div>
            <div className="text-muted-foreground">{matter.tenants?.phone || ""}</div>
            <div className="text-muted-foreground">{matter.tenants?.email || ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Property</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {matter.properties
              ? `${matter.properties.address_line1}, ${matter.properties.city}, ${matter.properties.state} ${matter.properties.zip || ""}`
              : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Filing eligibility</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Proposed: </span>
              {matter.proposed_eligible_to_file_date || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Attorney-confirmed: </span>
              {matter.confirmed_eligible_to_file_date || "Not confirmed"}
            </div>
            <div className="text-muted-foreground">Ledger balance: ${balance.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Notices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Served</TableHead>
                <TableHead>Cure by</TableHead>
                <TableHead>Eligible to file</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground text-center py-6">No notices recorded</TableCell></TableRow>
              ) : notices.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="capitalize">{String(n.notice_kind).replace(/_/g, " ")}</TableCell>
                  <TableCell className="capitalize">{String(n.status).replace(/_/g, " ")}</TableCell>
                  <TableCell>{n.served_date || "—"}</TableCell>
                  <TableCell>{n.cure_by_date || "—"}</TableCell>
                  <TableCell>{n.eligible_to_file_date || "—"}</TableCell>
                  <TableCell>${Number(n.amount_demanded || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {documents.length === 0 ? (
              <p className="text-muted-foreground">No documents shared for review</p>
            ) : documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-2">
                <span className="truncate">{d.file_name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{String(d.category).replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tasks.length === 0 ? (
              <p className="text-muted-foreground">No tasks assigned</p>
            ) : tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-2">
                <span className="truncate">{t.title}</span>
                <Badge variant={t.status === "completed" ? "outline" : "secondary"} className="text-[10px] capitalize">
                  {t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea
              rows={3}
              placeholder="Add a note for the file…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>Add note</Button>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                {new Date(n.created_at).toLocaleString()}
              </div>
              {n.content}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}