import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  availableTransitions,
  fetchTransitionRules,
  newIdempotencyKey,
  transitionMatter,
  type ActorRole,
  type CaseStatus,
  type TransitionRule,
} from "@/lib/transitions";
import { ArrowRight } from "lucide-react";

type Props = { caseId: string; status: CaseStatus; onChanged: () => void };

export default function MatterActionsPanel({ caseId, status, onChanged }: Props) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const role: ActorRole = isAdmin ? "admin" : "client";
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [pending, setPending] = useState<TransitionRule | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [idemKey, setIdemKey] = useState<string>("");

  useEffect(() => {
    fetchTransitionRules().then(setRules).catch(() => setRules([]));
  }, []);

  const actions = availableTransitions(rules, status, role);

  const run = async () => {
    if (!pending || busy) return;
    if (pending.requires_reason && !reason.trim()) {
      toast({ title: "A reason is required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await transitionMatter(caseId, pending.transition_key, reason || null, undefined, idemKey);
      toast({ title: pending.label, description: `Status is now ${pending.to_status.replace(/_/g, " ")}` });
      setPending(null);
      setReason("");
      onChanged();
    } catch (e) {
      toast({ title: "Transition blocked", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!actions.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Available Actions</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.transition_key}
            size="sm"
            variant="outline"
            onClick={() => { setPending(a); setReason(""); setIdemKey(newIdempotencyKey()); }}
          >
            {a.label}<ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        ))}

        <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{pending?.label}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Moves this matter to <span className="font-medium">{pending?.to_status.replace(/_/g, " ")}</span>.
              {pending?.requires_reason ? " A reason is required." : " A reason is optional but recorded."}
            </p>
            <Textarea placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
              <Button onClick={run} disabled={busy}>{busy ? "Applying…" : "Confirm"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
