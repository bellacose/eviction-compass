import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  caseId: string;
  /** Admin views include internal-only events. */
  includeInternal?: boolean;
}

export default function MatterTimeline({ caseId, includeInternal = false }: Props) {
  const [events, setEvents] = useState<any[]>([]);

  const load = useCallback(async () => {
    let query = supabase
      .from("matter_events")
      .select("*")
      .eq("case_id", caseId)
      .order("occurred_at", { ascending: false });
    if (!includeInternal) query = query.eq("is_internal", false);
    const { data } = await query;
    setEvents(data ?? []);
  }, [caseId, includeInternal]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Matter Timeline</CardTitle></CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{e.label}</p>
                  {e.is_internal && <Badge variant="outline" className="text-[10px]">Internal</Badge>}
                </div>
                {e.detail && <p className="text-sm text-muted-foreground">{e.detail}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(e.occurred_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
