import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ListChecks } from "lucide-react";

/** Cross-matter open task feed for the admin and client dashboards. */
export default function NextActionsList({ basePath }: { basePath: "/admin/cases" | "/client/cases" }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [holds, setHolds] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [t, h] = await Promise.all([
        supabase.from("tasks")
          .select("*, cases(case_number, status)")
          .in("status", ["open", "in_progress"])
          .order("due_at", { nullsFirst: false })
          .limit(8),
        supabase.from("matter_holds")
          .select("id, case_id, hold_type, review_date, cases(case_number)")
          .is("released_at", null)
          .limit(5),
      ]);
      setTasks(t.data ?? []);
      setHolds(h.data ?? []);
    };
    load();
  }, []);

  if (!tasks.length && !holds.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" />Next Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {tasks.map((t) => (
          <Link key={t.id} to={`${basePath}/${t.case_id}`} className="flex items-center gap-3 py-1.5 text-sm border-b last:border-0 hover:bg-accent/50 -mx-2 px-2 rounded">
            <span className="font-mono text-xs w-28 shrink-0">{(t.cases as any)?.case_number}</span>
            <span className="flex-1 truncate">{t.title}</span>
            {t.blocking && <Badge variant="destructive" className="text-[10px]">Blocking</Badge>}
            {t.due_at && <span className="text-xs text-muted-foreground">{format(new Date(t.due_at), "MMM d")}</span>}
          </Link>
        ))}
        {holds.map((h) => (
          <Link key={h.id} to={`${basePath}/${h.case_id}`} className="flex items-center gap-3 py-1.5 text-sm border-b last:border-0 hover:bg-accent/50 -mx-2 px-2 rounded">
            <span className="font-mono text-xs w-28 shrink-0">{(h.cases as any)?.case_number}</span>
            <span className="flex-1 truncate capitalize">{String(h.hold_type).replace(/_/g, " ")} hold active</span>
            {h.review_date && <span className="text-xs text-muted-foreground">{format(new Date(h.review_date), "MMM d")}</span>}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
