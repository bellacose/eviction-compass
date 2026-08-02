import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { STATUS_LABELS } from "@/lib/case-utils";
import { nextRequiredAction } from "@/lib/matter";
import {
  availableTransitions,
  completeTask,
  fetchActiveHolds,
  fetchOpenTasks,
  fetchTransitionRules,
  HOLD_TYPE_LABELS,
  type ActorRole,
  type CaseStatus,
  type TransitionRule,
} from "@/lib/transitions";
import { useAuth } from "@/lib/auth";

type Props = {
  caseId: string;
  status: CaseStatus;
  /** clients get a read-only view without task completion */
  readOnly?: boolean;
  refreshKey?: number;
  onChanged?: () => void;
};

const STAGE_BY_STATUS: Record<string, string> = {
  draft: "Intake",
  attorney_review: "Review",
  intake: "Intake",
  notice_preparation: "Pre-litigation",
  notice_served: "Pre-litigation",
  waiting_period: "Pre-litigation",
  ready_to_file: "Pre-litigation",
  filed: "Litigation",
  court_scheduled: "Litigation",
  in_court_process: "Litigation",
  outcome_pending: "Litigation",
  resolved: "Resolution",
  closed: "Resolution",
  on_hold: "Suspended",
};

export default function NextActionPanel({ caseId, status, readOnly, refreshKey, onChanged }: Props) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const role: ActorRole = isAdmin ? "admin" : "client";
  const [holds, setHolds] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [rules, setRules] = useState<TransitionRule[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [h, t, r] = await Promise.all([fetchActiveHolds(caseId), fetchOpenTasks(caseId), fetchTransitionRules().catch(() => [])]);
    setHolds(h);
    setTasks(t);
    setRules(r as TransitionRule[]);
    const ids = Array.from(new Set(t.map((x: any) => x.assigned_user_id).filter(Boolean)));
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids as string[]);
      setPeople(Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? ""])));
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const hold = holds[0];
  const task = tasks.find((t) => t.blocking) ?? tasks[0];
  const actions = availableTransitions(rules, status, role);
  const blockedBy = hold
    ? actions.filter((a) => a.blocking_hold_types?.includes(hold.hold_type)).map((a) => a.label)
    : [];

  const finish = async (id: string) => {
    try {
      await completeTask(id);
      toast({ title: "Task completed" });
      await load();
      onChanged?.();
    } catch (e) {
      toast({ title: "Could not complete task", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className={hold ? "border-status-warning/40" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" />Next Action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STATUS_LABELS[status] ?? status}</Badge>
          <span className="text-xs text-muted-foreground">Stage: {STAGE_BY_STATUS[status] ?? "—"}</span>
          {hold && (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {HOLD_TYPE_LABELS[hold.hold_type] ?? hold.hold_type} hold
            </Badge>
          )}
        </div>

        {hold && (
          <div className="text-xs text-muted-foreground">
            {hold.reason}
            {hold.review_date && ` · Review ${format(new Date(hold.review_date), "MMM d, yyyy")}`}
            {blockedBy.length > 0 && ` · Blocks: ${blockedBy.join(", ")}`}
          </div>
        )}

        <div>
          <div className="font-medium">{task ? task.title : nextRequiredAction({ status })}</div>
          <div className="text-xs text-muted-foreground">
            {task?.assigned_user_id
              ? `Assigned to ${people[task.assigned_user_id] ?? "a team member"}`
              : task?.assigned_role
                ? `Assigned to ${task.assigned_role}`
                : "Unassigned"}
            {task?.due_at && ` · Due ${format(new Date(task.due_at), "MMM d, yyyy")}`}
            {task?.blocking && " · Blocking"}
          </div>
          {task?.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
        </div>

        {!readOnly && tasks.length > 0 && (
          <div className="space-y-1">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs border-t pt-1">
                <span className="flex-1 truncate">{t.title}</span>
                {t.due_at && <span className="text-muted-foreground">{format(new Date(t.due_at), "MMM d")}</span>}
                <Button size="sm" variant="ghost" className="h-6" onClick={() => finish(t.id)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Done
                </Button>
              </div>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Available: {actions.map((a) => a.label).join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
