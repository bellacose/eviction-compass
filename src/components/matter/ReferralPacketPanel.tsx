import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ASSIGNMENT_SCOPES,
  issueReferralPacket,
  packetStatusTone,
  type AssignmentScope,
  type ReferralPacketStatus,
} from "@/lib/attorney";
import { FileStack, AlertTriangle, Eye } from "lucide-react";
import { format } from "date-fns";

interface Packet {
  id: string;
  version: number;
  status: ReferralPacketStatus;
  counsel_id: string | null;
  balance_amount: number;
  balance_as_of: string | null;
  notes: string | null;
  issued_at: string | null;
  approved_at: string | null;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  review_flagged_at: string | null;
  review_reason: string | null;
}

export default function ReferralPacketPanel({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [counsel, setCounsel] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [counselId, setCounselId] = useState<string>("");
  const [scope, setScope] = useState<AssignmentScope>("attorney_only");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [p, c, a] = await Promise.all([
      supabase.from("referral_packets").select("*").eq("case_id", caseId).order("version", { ascending: false }),
      supabase.from("counsel").select("id, attorney_name, firm_name, status, is_active").order("attorney_name"),
      supabase.from("case_counsel").select("*").eq("case_id", caseId).is("unassigned_at", null).maybeSingle(),
    ]);
    setPackets((p.data || []) as unknown as Packet[]);
    setCounsel(c.data || []);
    setAssignment(a.data || null);
    if (a.data) {
      setCounselId((a.data as any).counsel_id);
      setScope(((a.data as any).scope as AssignmentScope) || "attorney_only");
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId]);

  const saveAssignment = async () => {
    if (!counselId) {
      toast({ title: "Select counsel first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const firm_id = counsel.find((c) => c.id === counselId)?.firm_id ?? null;
    const payload = { case_id: caseId, counsel_id: counselId, scope, firm_id };
    const { error } = assignment
      ? await supabase.from("case_counsel").update({ counsel_id: counselId, scope, firm_id }).eq("id", assignment.id)
      : await supabase.from("case_counsel").insert(payload);
    setBusy(false);
    if (error) {
      toast({ title: "Could not save assignment", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Assignment saved" });
    load();
  };

  const issue = async () => {
    setBusy(true);
    try {
      await issueReferralPacket(caseId, counselId || null, notes || undefined);
      setNotes("");
      toast({ title: "Referral packet issued", description: "The previous version is now superseded." });
      load();
    } catch (e: any) {
      toast({ title: "Could not issue packet", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const current = packets.find((p) => p.status === "issued" || p.status === "approved") || null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Counsel assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assigned counsel</Label>
              <Select value={counselId} onValueChange={setCounselId}>
                <SelectTrigger><SelectValue placeholder="Select counsel" /></SelectTrigger>
                <SelectContent>
                  {counsel.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.attorney_name}{c.firm_name ? ` — ${c.firm_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignment scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as AssignmentScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ASSIGNMENT_SCOPES.find((s) => s.value === scope)?.description}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={saveAssignment} disabled={busy}>Save assignment</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileStack className="h-4 w-4" />Referral packets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {current?.invalidated_at && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
              <span>
                Approval was invalidated by a hard change ({current.invalidation_reason}). Issue a new packet version.
              </span>
            </div>
          )}
          {current?.review_flagged_at && !current?.invalidated_at && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
              <Eye className="h-4 w-4 mt-0.5" />
              <span>Flagged for re-review after a soft change ({current.review_reason}). Approval still stands.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Packet notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for counsel…" />
            <Button size="sm" onClick={issue} disabled={busy}>
              Issue packet v{(packets[0]?.version ?? 0) + 1}
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : packets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No referral packet has been issued yet.</p>
            ) : (
              packets.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">Version {p.version}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.issued_at ? format(new Date(p.issued_at), "PP p") : "Not issued"} · Balance $
                      {Number(p.balance_amount || 0).toLocaleString()}
                      {p.balance_as_of ? ` as of ${p.balance_as_of}` : ""}
                    </div>
                  </div>
                  <Badge variant={packetStatusTone(p.status)} className="text-xs capitalize">{p.status}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}