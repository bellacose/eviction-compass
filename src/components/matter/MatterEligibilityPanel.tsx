import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarCheck, AlertTriangle } from "lucide-react";
import { eligibilityLabel, type EligibilityState } from "@/lib/transitions";
import {
  confirmEligibilityV2,
  fetchFilingReview,
  confirmationStatusTone,
  type EligibilityConfirmation,
  type ReviewActorRole,
} from "@/lib/eligibility";

/** Proposed (system-calculated) vs attorney-confirmed filing eligibility (Bible §5). */
export default function MatterEligibilityPanel({
  caseId,
  actorRole = "admin",
  readOnly,
  onChanged,
}: {
  caseId: string;
  actorRole?: ReviewActorRole;
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<EligibilityState & { notes: string | null }>({
    proposed: null, confirmed: null, confirmedAt: null, notes: null,
  });
  const [confirmation, setConfirmation] = useState<EligibilityConfirmation | null>(null);
  const [invalidated, setInvalidated] = useState<EligibilityConfirmation | null>(null);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("cases")
      .select("proposed_eligible_to_file_date, confirmed_eligible_to_file_date, eligibility_confirmed_at, confirmation_notes")
      .eq("id", caseId)
      .maybeSingle();
    const review = await fetchFilingReview(caseId);
    setConfirmation(review.activeConfirmation);
    setInvalidated(review.activeConfirmation ? null : review.confirmations.find((c) => c.status === "invalidated") ?? null);
    if (!data) return;
    setState({
      proposed: (data as any).proposed_eligible_to_file_date,
      confirmed: (data as any).confirmed_eligible_to_file_date,
      confirmedAt: (data as any).eligibility_confirmed_at,
      notes: (data as any).confirmation_notes,
    });
    setDate(((data as any).confirmed_eligible_to_file_date ?? (data as any).proposed_eligible_to_file_date ?? "") as string);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const current = eligibilityLabel(state);

  const save = async () => {
    if (!date) { toast({ title: "Pick a confirmed date", variant: "destructive" }); return; }
    if (!notes.trim()) { toast({ title: "Confirmation notes are required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await confirmEligibilityV2({ caseId, confirmedDate: date, notes: notes.trim() });
      toast({ title: "Filing eligibility confirmed" });
      setNotes("");
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not confirm", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><CalendarCheck className="h-4 w-4" />Filing Eligibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={confirmation ? confirmationStatusTone(confirmation.status) : "outline"}>
            {confirmation ? `Confirmed v${confirmation.version_number}` : current.label ?? "Not calculated"}
          </Badge>
          <span className="font-medium">{current.date ? format(new Date(current.date), "MMM d, yyyy") : "—"}</span>
        </div>
        {!confirmation && invalidated && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <span>Confirmation v{invalidated.version_number} was invalidated: {invalidated.invalidation_reason}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {state.proposed && `System-proposed ${format(new Date(state.proposed), "MMM d, yyyy")}. `}
          {state.confirmedAt
            ? `Confirmed ${format(new Date(state.confirmedAt), "MMM d, yyyy")}.`
            : "System-calculated dates stay Proposed until an authorized reviewer confirms them."}
        </p>
        {state.notes && <p className="text-xs">{state.notes}</p>}
        {!readOnly && actorRole !== "client" && (
        <>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Confirmed date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes (required)</Label>
            <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={busy}>
          {confirmation ? "Re-confirm eligibility" : "Confirm Eligibility"}
        </Button>
        </>
        )}
      </CardContent>
    </Card>
  );
}
