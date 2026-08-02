import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  fetchReferralRules, fetchReferrals, fetchReferralHistory, createReferral,
  transitionReferral, attachRevisedPacket, availableReferralTransitions,
  evaluateReferralTransition, activeReferral, referralStatusTone, newIdempotencyKey,
  type ReferralActorRole, type ReferralTransitionRule, type ReferralStatus,
} from "@/lib/referrals";
import { Scale, History, FilePlus2 } from "lucide-react";

interface Props {
  caseId: string;
  actorRole: ReferralActorRole;
  /** counsel id of the signed-in attorney, when the actor is an attorney */
  actorAttorneyId?: string | null;
  onChanged?: () => void;
}

export default function ReferralPanel({ caseId, actorRole, actorAttorneyId, onChanged }: Props) {
  const { toast } = useToast();
  const [rules, setRules] = useState<ReferralTransitionRule[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [packets, setPackets] = useState<any[]>([]);
  const [counsel, setCounsel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ReferralTransitionRule | null>(null);
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // admin create form
  const [newAttorney, setNewAttorney] = useState("");
  const [newPacket, setNewPacket] = useState("");
  const [fee, setFee] = useState("");

  const load = async () => {
    const [r, refs] = await Promise.all([fetchReferralRules(), fetchReferrals(caseId)]);
    setRules(r);
    setReferrals(refs);
    const act = activeReferral(refs as any);
    setHistory(act ? await fetchReferralHistory((act as any).id) : []);
    if (actorRole === "admin") {
      const [pk, cs] = await Promise.all([
        supabase.from("referral_packets").select("id, version, status").eq("case_id", caseId).order("version", { ascending: false }),
        supabase.from("counsel").select("id, attorney_name, firm_name, firm_id, status").eq("is_active", true).order("attorney_name"),
      ]);
      setPackets(pk.data || []);
      setCounsel(cs.data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); /* eslint-disable-next-line */ }, [caseId]);

  const current = activeReferral(referrals as any) as any | null;
  const historical = referrals.filter((r) => r.id !== current?.id);

  const actions = current
    ? availableReferralTransitions(rules, current.status as ReferralStatus, actorRole).filter((rule) =>
        evaluateReferralTransition(rule, {
          status: current.status,
          actorRole,
          actorAttorneyId,
          referralAttorneyId: current.attorney_id,
          referralPacketId: current.referral_packet_id,
          reason: "placeholder",
        }).ok,
      )
    : [];

  const draft = referrals.find((r) => r.status === "draft");
  const draftActions = draft
    ? availableReferralTransitions(rules, "draft", actorRole)
    : [];

  const run = async (rule: ReferralTransitionRule, referralId: string, why?: string) => {
    setBusy(true);
    try {
      await transitionReferral(referralId, rule.transition_key, why ?? null, {}, newIdempotencyKey());
      toast({ title: rule.label, description: "Referral updated." });
      setPending(null);
      setReason("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Action blocked", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onAction = (rule: ReferralTransitionRule, referralId: string) => {
    if (rule.requires_reason) {
      setPending({ ...rule, transition_key: rule.transition_key });
      (rule as any)._referralId = referralId;
      setPending(rule);
      setReason("");
      (window as any).__referralTarget = referralId;
      return;
    }
    (window as any).__referralTarget = referralId;
    setPending(rule);
  };

  const confirmPending = async () => {
    if (!pending) return;
    const target = (window as any).__referralTarget as string;
    await run(pending, target, pending.requires_reason ? reason : undefined);
  };

  const create = async () => {
    setBusy(true);
    try {
      const c = counsel.find((x) => x.id === newAttorney);
      await createReferral({
        caseId,
        attorneyId: newAttorney || null,
        firmId: c?.firm_id ?? null,
        packetId: newPacket || null,
        feeArrangement: fee.trim() || null,
        idempotencyKey: newIdempotencyKey(),
      });
      setNewAttorney(""); setNewPacket(""); setFee("");
      toast({ title: "Referral drafted" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Could not create referral", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const revise = async (packetId: string) => {
    if (!current) return;
    setBusy(true);
    try {
      await attachRevisedPacket(current.id, packetId, "Revised packet issued by staff");
      toast({ title: "Revised packet attached", description: "The attorney must acknowledge it." });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Could not attach packet", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4" /> Attorney referral
        </CardTitle>
        {referrals.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4 mr-1" />History
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {current ? (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={referralStatusTone(current.status)} className="capitalize">
                {String(current.status).replace(/_/g, " ")}
              </Badge>
              {current.referral_packets && (
                <Badge variant="outline">Packet v{current.referral_packets.version}</Badge>
              )}
              <span className="text-muted-foreground">
                {current.counsel?.attorney_name || current.firms?.name || "Unassigned"}
              </span>
            </div>
            {actorRole === "admin" && current.fee_arrangement && (
              <div className="text-xs text-muted-foreground">Fee: {current.fee_arrangement}</div>
            )}
            {current.decline_reason && (
              <div className="text-xs text-destructive">Declined: {current.decline_reason}</div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map((rule) => (
                <Button
                  key={rule.transition_key}
                  size="sm"
                  variant={rule.to_status === "declined" || rule.to_status === "withdrawn" ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => onAction(rule, current.id)}
                >
                  {rule.label}
                </Button>
              ))}
              {actions.length === 0 && (
                <span className="text-xs text-muted-foreground">No referral actions available to you.</span>
              )}
            </div>
            {actorRole === "admin" && packets.length > 0 && (
              <div className="pt-2 border-t space-y-1">
                <Label className="text-xs">Attach revised packet</Label>
                <Select onValueChange={revise}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select a packet version" /></SelectTrigger>
                  <SelectContent>
                    {packets
                      .filter((p) => p.id !== current.referral_packet_id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>v{p.version} · {p.status}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : draft && actorRole === "admin" ? (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Draft</Badge>
              <span className="text-muted-foreground">
                {counsel.find((c) => c.id === draft.attorney_id)?.attorney_name || "Unassigned"}
              </span>
              {draft.referral_packet_id ? null : (
                <span className="text-xs text-destructive">Packet version required before sending</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {draftActions.map((rule) => (
                <Button key={rule.transition_key} size="sm" disabled={busy || !draft.referral_packet_id}
                        onClick={() => onAction(rule, draft.id)}>
                  {rule.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No active referral on this matter.</p>
        )}

        {actorRole === "admin" && !current && !draft && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2 font-medium"><FilePlus2 className="h-4 w-4" />New referral</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Attorney</Label>
                <Select value={newAttorney} onValueChange={setNewAttorney}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select attorney" /></SelectTrigger>
                  <SelectContent>
                    {counsel.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.attorney_name}{c.firm_name ? ` · ${c.firm_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Referral packet version</Label>
                <Select value={newPacket} onValueChange={setNewPacket}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select packet" /></SelectTrigger>
                  <SelectContent>
                    {packets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>v{p.version} · {p.status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Fee arrangement (internal)</Label>
              <Input className="h-8" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Flat fee, hourly…" />
            </div>
            <Button size="sm" disabled={busy || !newAttorney} onClick={create}>Create draft referral</Button>
            {packets.length === 0 && (
              <p className="text-xs text-muted-foreground">Issue a referral packet first — a referral cannot be sent without one.</p>
            )}
          </div>
        )}

        {showHistory && (
          <div className="space-y-2 border-t pt-3">
            {history.map((h: any) => (
              <div key={h.id} className="text-xs text-muted-foreground">
                {new Date(h.created_at).toLocaleString()} · {String(h.from_status).replace(/_/g, " ")} →{" "}
                {String(h.to_status).replace(/_/g, " ")} ({h.actor_role})
                {h.reason ? ` — ${h.reason}` : ""}
              </div>
            ))}
            {historical.map((r: any) => (
              <div key={r.id} className="rounded-md bg-muted/50 p-2 text-xs">
                <span className="capitalize font-medium">{String(r.status).replace(/_/g, " ")}</span>
                {" · "}{r.counsel?.attorney_name || r.firms?.name || "Unassigned"}
                {r.decline_reason ? ` — ${r.decline_reason}` : ""}
                {r.withdrawal_reason ? ` — ${r.withdrawal_reason}` : ""}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              This action is recorded on the matter timeline and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.requires_reason && (
            <div className="space-y-1">
              <Label className="text-xs">Reason (required)</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || (pending?.requires_reason && !reason.trim())}
              onClick={(e) => { e.preventDefault(); confirmPending(); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
