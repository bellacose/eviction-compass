import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  fetchInformationRequests, fetchRequestResponses, createInformationRequest,
  respondToInformationRequest, reviewInformationRequest, resolveInformationRequest,
  withdrawInformationRequest, blocksFilingApproval, newIdempotencyKey,
  INFORMATION_REQUEST_CATEGORIES, type InformationRequestCategory,
} from "@/lib/referrals";
import { HelpCircle, AlertTriangle } from "lucide-react";

type Viewer = "admin" | "attorney" | "client";

interface Props {
  caseId: string;
  viewer: Viewer;
  referralId?: string | null;
  onChanged?: () => void;
}

const statusTone = (s: string): "default" | "secondary" | "outline" | "destructive" =>
  s === "resolved" ? "default" : s === "open" ? "destructive" : s === "withdrawn" ? "outline" : "secondary";

export default function InformationRequestsPanel({ caseId, viewer, referralId, onChanged }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<InformationRequestCategory>("lease");
  const [description, setDescription] = useState("");
  const [blocking, setBlocking] = useState(true);

  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    { kind: "resolve" | "reopen" | "withdraw"; id: string } | null
  >(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const rs = await fetchInformationRequests(caseId);
      setRequests(rs);
      const map: Record<string, any[]> = {};
      await Promise.all(rs.map(async (r) => { map[r.id] = await fetchRequestResponses(r.id); }));
      setResponses(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [caseId]);

  const canRequest = viewer === "attorney" || viewer === "admin";
  const canReview = viewer === "attorney" || viewer === "admin";
  const blocked = blocksFilingApproval(requests as any);

  const submitRequest = async () => {
    setBusy(true);
    try {
      await createInformationRequest({
        caseId, category, description: description.trim(), blocking,
        referralId: referralId ?? null, assignedRole: "client",
        idempotencyKey: newIdempotencyKey(),
      });
      setDescription("");
      toast({ title: "Information requested", description: "A task was created for the client." });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Could not create request", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const submitReply = async (id: string) => {
    setBusy(true);
    try {
      await respondToInformationRequest(id, replyText.trim(), [], newIdempotencyKey());
      setReplyFor(null); setReplyText("");
      toast({ title: "Response submitted" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Could not submit response", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const takeUnderReview = async (id: string) => {
    try {
      await reviewInformationRequest(id);
      await load();
    } catch (e: any) {
      toast({ title: "Could not update", description: e.message, variant: "destructive" });
    }
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction.kind === "withdraw") await withdrawInformationRequest(confirmAction.id, notes.trim());
      else await resolveInformationRequest(confirmAction.id, notes.trim(), confirmAction.kind === "reopen");
      setConfirmAction(null); setNotes("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast({ title: "Action blocked", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading) return null;
  if (viewer === "client" && requests.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {viewer === "client" ? "Attorney requests" : "Information requests"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {blocked && canReview && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span>A blocking information request is open. Filing approval is unavailable until it is resolved.</span>
          </div>
        )}

        {requests.length === 0 ? (
          <p className="text-muted-foreground">No information requests on this matter.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusTone(r.status)} className="capitalize">
                  {String(r.status).replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {String(r.category).replace(/_/g, " ")}
                </Badge>
                {r.blocking && <Badge variant="destructive" className="text-[10px]">Blocking</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <p>{r.description}</p>

              {(responses[r.id] || []).map((resp) => (
                <div key={resp.id} className="rounded-md bg-muted/50 p-2 text-xs">
                  <div className="text-muted-foreground mb-1">
                    {resp.is_revision ? "Revised response" : "Response"} ·{" "}
                    {new Date(resp.created_at).toLocaleString()}
                  </div>
                  {resp.response_text}
                </div>
              ))}

              {r.resolution_notes && canReview && (
                <div className="text-xs text-muted-foreground">Resolution: {r.resolution_notes}</div>
              )}

              {/* client / assignee reply */}
              {["open", "responded", "under_review"].includes(r.status) && (
                replyFor === r.id ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Answer the attorney's request…" />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy || !replyText.trim()} onClick={() => submitReply(r.id)}>
                        Submit response
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplyFor(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(viewer === "client" || viewer === "admin") && (
                      <Button size="sm" variant="outline" onClick={() => { setReplyFor(r.id); setReplyText(""); }}>
                        {responses[r.id]?.length ? "Submit revised response" : "Respond"}
                      </Button>
                    )}
                    {canReview && r.status === "responded" && (
                      <Button size="sm" variant="outline" onClick={() => takeUnderReview(r.id)}>Take under review</Button>
                    )}
                    {canReview && ["responded", "under_review"].includes(r.status) && (
                      <>
                        <Button size="sm" onClick={() => { setConfirmAction({ kind: "resolve", id: r.id }); setNotes(""); }}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline"
                                onClick={() => { setConfirmAction({ kind: "reopen", id: r.id }); setNotes(""); }}>
                          Reopen
                        </Button>
                      </>
                    )}
                    {canReview && (
                      <Button size="sm" variant="ghost"
                              onClick={() => { setConfirmAction({ kind: "withdraw", id: r.id }); setNotes(""); }}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          ))
        )}

        {canRequest && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-xs">New request</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InformationRequestCategory)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INFORMATION_REQUEST_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe exactly what is missing…" />
            <div className="flex items-center gap-2">
              <Switch checked={blocking} onCheckedChange={setBlocking} id="blocking" />
              <Label htmlFor="blocking" className="text-xs">Blocking — prevents filing approval</Label>
            </div>
            <Button size="sm" disabled={busy || !description.trim()} onClick={submitRequest}>
              Send request
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) { setConfirmAction(null); setNotes(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">{confirmAction?.kind} information request</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "resolve"
                ? "Resolving records the outcome on the timeline. It does not approve filing."
                : confirmAction?.kind === "reopen"
                  ? "Reopening creates a new task for the responder. The original request and responses are preserved."
                  : "Withdrawing closes the request and cancels its task."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">
              {confirmAction?.kind === "resolve" ? "Resolution notes (required)" :
               confirmAction?.kind === "withdraw" ? "Reason (required)" : "What is still needed"}
            </Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || (confirmAction?.kind !== "reopen" && !notes.trim())}
              onClick={(e) => { e.preventDefault(); runConfirm(); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
