import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Gavel, AlertTriangle } from "lucide-react";
import {
  approveFilingReadiness,
  canApproveFiling,
  canWithdrawApproval,
  confirmationStatusTone,
  fetchFilingReview,
  withdrawFilingApproval,
  type EligibilityConfirmation,
  type FilingApproval,
  type ReviewActorRole,
} from "@/lib/eligibility";

interface Props {
  caseId: string;
  actorRole: ReviewActorRole;
  actorAttorneyId?: string | null;
  readOnly?: boolean;
  onChanged?: () => void;
}

/** Attorney filing approval with immutable version history (Bible §7). */
export default function FilingApprovalPanel({ caseId, actorRole, actorAttorneyId, readOnly, onChanged }: Props) {
  const { toast } = useToast();
  const [confirmations, setConfirmations] = useState<EligibilityConfirmation[]>([]);
  const [approvals, setApprovals] = useState<FilingApproval[]>([]);
  const [activeConfirmation, setActiveConfirmation] = useState<EligibilityConfirmation | null>(null);
  const [activeApproval, setActiveApproval] = useState<FilingApproval | null>(null);
  const [blocking, setBlocking] = useState(0);
  const [holds, setHolds] = useState(0);
  const [packetStatus, setPacketStatus] = useState<string | null>(null);
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const review = await fetchFilingReview(caseId);
    setConfirmations(review.confirmations);
    setApprovals(review.approvals);
    setActiveConfirmation(review.activeConfirmation);
    setActiveApproval(review.activeApproval);

    const [ir, mh, pk, ref] = await Promise.all([
      supabase.from("information_requests").select("id", { count: "exact", head: true })
        .eq("case_id", caseId).eq("blocking", true).in("status", ["open", "responded", "under_review"]),
      supabase.from("matter_holds").select("id", { count: "exact", head: true })
        .eq("case_id", caseId).is("released_at", null),
      supabase.from("referral_packets").select("status").eq("case_id", caseId)
        .order("version", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("attorney_referrals").select("status").eq("case_id", caseId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setBlocking(ir.count ?? 0);
    setHolds(mh.count ?? 0);
    setPacketStatus((pk.data as any)?.status ?? null);
    setReferralStatus((ref.data as any)?.status ?? null);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const ctx = {
    actorRole,
    actorAttorneyId,
    isAssigned: true,
    referralStatus,
    packetStatus,
    blockingRequestCount: blocking,
    activeHoldCount: holds,
    hasServedNotice: true,
    hasServiceRecord: true,
    hasLedgerEntries: true,
    hasTenancyFacts: true,
    confirmation: activeConfirmation,
    approval: activeApproval,
  };

  const approveGuard = canApproveFiling(ctx);
  const withdrawGuard = canWithdrawApproval(ctx, reason || "placeholder");

  const approve = async () => {
    setBusy(true);
    try {
      await approveFilingReadiness(caseId, notes || null);
      toast({ title: "Filing readiness approved" });
      setNotes("");
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not approve", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const withdraw = async () => {
    if (!activeApproval) return;
    setBusy(true);
    try {
      await withdrawFilingApproval(activeApproval.id, reason);
      toast({ title: "Filing approval withdrawn" });
      setReason("");
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not withdraw", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const invalidated = approvals.find((a) => a.approval_status === "invalidated");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Gavel className="h-4 w-4" />Filing Approval</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={activeApproval ? confirmationStatusTone(activeApproval.approval_status) : "outline"}>
            {activeApproval ? `Approved v${activeApproval.version_number}` : "Not approved"}
          </Badge>
          {activeApproval?.approved_at && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(activeApproval.approved_at), "MMM d, yyyy h:mm a")}
            </span>
          )}
        </div>

        {!activeApproval && invalidated && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <span>Approval v{invalidated.version_number} was invalidated: {invalidated.invalidation_reason}</span>
          </div>
        )}

        {!readOnly && !activeApproval && (
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Approval notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" onClick={approve} disabled={busy || !approveGuard.ok}>Approve filing readiness</Button>
            {!approveGuard.ok && <p className="text-xs text-muted-foreground">{(approveGuard as { error: string }).error}</p>}
          </div>
        )}

        {!readOnly && activeApproval && (
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Reason for withdrawal (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" variant="outline" onClick={withdraw} disabled={busy || !reason.trim() || !withdrawGuard.ok}>
              Withdraw approval
            </Button>
            {!withdrawGuard.ok && <p className="text-xs text-muted-foreground">{(withdrawGuard as { error: string }).error}</p>}
          </div>
        )}

        {(confirmations.length > 0 || approvals.length > 0) && (
          <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">History</div>
            {confirmations.map((c) => (
              <div key={c.id} className="flex justify-between gap-2">
                <span>Eligibility v{c.version_number} · {c.status}</span>
                <span>{format(new Date(c.confirmed_at), "MMM d, yyyy")}</span>
              </div>
            ))}
            {approvals.map((a) => (
              <div key={a.id} className="flex justify-between gap-2">
                <span>Approval v{a.version_number} · {a.approval_status}</span>
                <span>{format(new Date(a.created_at), "MMM d, yyyy")}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}