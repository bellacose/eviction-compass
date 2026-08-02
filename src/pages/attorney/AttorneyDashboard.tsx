import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  loadAttorneyQueue, groupQueue, QUEUE_GROUPS, type QueueRow, type QueueGroupKey,
} from "@/lib/attorney-queue";
import {
  transitionReferral, referralStatusTone, newIdempotencyKey,
} from "@/lib/referrals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AttorneyDashboard() {
  const { profile, attorney } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState<QueueRow | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    loadAttorneyQueue()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const groups = groupQueue(rows);

  const act = async (row: QueueRow, key: string, why?: string) => {
    if (!row.referralId) return;
    setBusy(true);
    try {
      await transitionReferral(row.referralId, key, why ?? null, {}, newIdempotencyKey());
      toast({ title: "Referral updated" });
      setDeclining(null); setReason("");
      load();
    } catch (e: any) {
      toast({ title: "Action blocked", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const rowActions = (r: QueueRow) => {
    const named = !!attorney && (!r.assignedAttorney || true);
    const out: { label: string; run: () => void; variant?: "outline" }[] = [];
    if (r.referralStatus === "sent")
      out.push({ label: "Acknowledge", run: () => act(r, "acknowledge_referral") });
    if (r.referralStatus === "pending_acceptance" && named) {
      out.push({ label: "Accept", run: () => act(r, "accept_referral") });
      out.push({ label: "Decline", variant: "outline", run: () => { setDeclining(r); setReason(""); } });
    }
    if (r.openTaskTypes.includes("attorney_review_revised_packet"))
      out.push({ label: "Review revised packet", variant: "outline", run: () => {} });
    return out;
  };

  const Group = ({ k, label }: { k: QueueGroupKey; label: string }) => {
    const list = groups[k];
    if (list.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {label}
            <Badge variant="secondary">{list.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.map((r) => (
            <div key={`${k}-${r.caseId}`} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/attorney/matters/${r.caseId}`} className="font-medium text-sm hover:underline">
                    {r.caseNumber}
                  </Link>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.client} · {r.tenant} · {r.property}
                    {r.unit ? ` #${r.unit}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.matterType ? String(r.matterType).replace(/_/g, " ") : "—"} · Balance $
                    {r.balance.toLocaleString()}
                    {r.packetVersion ? ` · Packet v${r.packetVersion}` : ""}
                    {r.assignedAttorney ? ` · ${r.assignedAttorney}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1 shrink-0">
                  {r.referralStatus && (
                    <Badge variant={referralStatusTone(r.referralStatus)} className="capitalize text-[10px]">
                      {r.referralStatus.replace(/_/g, " ")}
                    </Badge>
                  )}
                  <StatusBadge status={r.matterStatus} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-muted-foreground">
                  {r.blockingItem && <span className="text-destructive">{r.blockingItem} · </span>}
                  {r.nextAction ? `Next: ${r.nextAction}` : "No open task"}
                  {r.dueDate ? ` · Due ${new Date(r.dueDate).toLocaleDateString()}` : ""}
                  {r.lastMaterialChange
                    ? ` · Changed ${new Date(r.lastMaterialChange).toLocaleDateString()}`
                    : ""}
                </div>
                <div className="flex gap-2">
                  {rowActions(r).map((a) => (
                    <Button key={a.label} size="sm" variant={a.variant} disabled={busy} onClick={a.run}>
                      {a.label}
                    </Button>
                  ))}
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/attorney/matters/${r.caseId}`}>Open</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const empty = QUEUE_GROUPS.every((g) => groups[g.key].length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attorney Queue</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.full_name ? `Signed in as ${profile.full_name}. ` : ""}
          You only see matters and referrals assigned to you or your firm.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : empty ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing in your queue right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {QUEUE_GROUPS.map((g) => (
            <Group key={g.key} k={g.key} label={g.label} />
          ))}
        </div>
      )}

      <AlertDialog open={!!declining} onOpenChange={(o) => { if (!o) { setDeclining(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline referral</AlertDialogTitle>
            <AlertDialogDescription>
              Declining returns the matter to staff for reassignment. It does not close the matter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Reason (required)</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !reason.trim()}
              onClick={(e) => { e.preventDefault(); declining && act(declining, "decline_referral", reason); }}
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
