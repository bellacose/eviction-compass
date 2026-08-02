import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pause, Play } from "lucide-react";
import { HOLD_TYPES, HOLD_TYPE_LABELS, openHold, releaseHold, type MatterHoldType } from "@/lib/transitions";
import { STATUS_LABELS } from "@/lib/case-utils";

type Props = { caseId: string; onChanged: () => void };

export default function MatterHoldPanel({ caseId, onChanged }: Props) {
  const { toast } = useToast();
  const [holds, setHolds] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [releasing, setReleasing] = useState<any>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ hold_type: MatterHoldType; reason: string; owner_user_id: string; review_date: string }>({
    hold_type: "bankruptcy", reason: "", owner_user_id: "", review_date: "",
  });

  const load = useCallback(async () => {
    const [h, s] = await Promise.all([
      supabase.from("matter_holds").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setHolds(h.data ?? []);
    setStaff(s.data ?? []);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const active = holds.filter((h) => !h.released_at);

  const submit = async () => {
    if (!form.reason.trim()) { toast({ title: "A reason is required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await openHold({
        caseId,
        holdType: form.hold_type,
        reason: form.reason,
        ownerUserId: form.owner_user_id || null,
        reviewDate: form.review_date || null,
      });
      toast({ title: "Hold opened" });
      setOpen(false);
      setForm({ hold_type: "bankruptcy", reason: "", owner_user_id: "", review_date: "" });
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Could not open hold", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const doRelease = async () => {
    if (!releasing) return;
    setBusy(true);
    try {
      await releaseHold(releasing.id, releaseReason);
      toast({
        title: "Hold released",
        description: releasing.held_from_status
          ? `Matter resumes at ${STATUS_LABELS[releasing.held_from_status] ?? releasing.held_from_status}`
          : undefined,
      });
      setReleasing(null);
      setReleaseReason("");
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Could not release hold", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Holds</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pause className="h-3 w-3 mr-1" />Open Hold</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!holds.length && <p className="text-sm text-muted-foreground">No holds recorded.</p>}
        {holds.map((h) => (
          <div key={h.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={h.released_at ? "outline" : "destructive"}>{HOLD_TYPE_LABELS[h.hold_type] ?? h.hold_type}</Badge>
              {h.released_at
                ? <span className="text-xs text-muted-foreground">Released {format(new Date(h.released_at), "MMM d, yyyy")}</span>
                : <span className="text-xs text-muted-foreground">Opened {format(new Date(h.created_at), "MMM d, yyyy")}</span>}
              {!h.released_at && (
                <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setReleasing(h)}>
                  <Play className="h-3 w-3 mr-1" />Release
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {h.held_from_status && <>Held from {STATUS_LABELS[h.held_from_status] ?? h.held_from_status} · </>}
              {h.owner_user_id && <>Owner {staff.find((s) => s.id === h.owner_user_id)?.full_name ?? "assigned"} · </>}
              {h.review_date && <>Review {format(new Date(h.review_date), "MMM d, yyyy")}</>}
            </div>
            {h.reason && <p>{h.reason}</p>}
            {h.release_reason && <p className="text-xs text-muted-foreground">Release: {h.release_reason}</p>}
          </div>
        ))}
        {active.length > 0 && (
          <p className="text-xs text-muted-foreground">Transitions incompatible with these hold types are blocked.</p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open Hold</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Hold type</Label>
              <Select value={form.hold_type} onValueChange={(v) => setForm({ ...form, hold_type: v as MatterHoldType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLD_TYPES.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Select value={form.owner_user_id || "none"} onValueChange={(v) => setForm({ ...form, owner_user_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name || s.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review date</Label>
              <Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>Open Hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!releasing} onOpenChange={(o) => !o && setReleasing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release Hold</DialogTitle></DialogHeader>
          <Textarea placeholder="Release reason" value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleasing(null)}>Cancel</Button>
            <Button onClick={doRelease} disabled={busy}>Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
