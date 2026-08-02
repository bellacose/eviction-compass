import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { DollarSign } from "lucide-react";
import NextActionsList from "@/components/matter/NextActionsList";

export default function ClientDashboard() {
  const [cases, setCases] = useState<any[]>([]);
  const [courtEvents, setCourtEvents] = useState<any[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: casesData } = await supabase.from("cases")
        .select("id, case_number, status, priority, updated_at, properties(address_line1, city), tenants(full_name)")
        .order("updated_at", { ascending: false });
      setCases(casesData || []);

      const { data: events } = await supabase.from("court_events")
        .select("*, cases(case_number)")
        .gte("start_at", new Date().toISOString())
        .order("start_at")
        .limit(5);
      setCourtEvents(events || []);

      const { data: pays } = await supabase.from("scheduled_payments")
        .select("*, cases(case_number)")
        .eq("status", "scheduled")
        .gte("due_date", new Date().toISOString().slice(0, 10))
        .order("due_date")
        .limit(5);
      setUpcomingPayments(pays || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Cases</h1>

      <NextActionsList basePath="/client/cases" />

      {courtEvents.length > 0 && (
        <Card className="border-status-warning/30 bg-status-warning/5">
          <CardHeader><CardTitle className="text-sm">Upcoming Court Dates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {courtEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="font-mono">{(e.cases as any)?.case_number}</span>
                <span>{e.court_name}</span>
                <span className="text-muted-foreground">{e.start_at && format(new Date(e.start_at), "MMM d, yyyy h:mm a")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Upcoming Payments</CardTitle>
            <Link to="/client/payments" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingPayments.map((p) => (
              <Link key={p.id} to={`/client/cases/${p.case_id}`} className="flex items-center justify-between text-sm hover:bg-accent/50 -mx-2 px-2 py-1 rounded">
                <span className="font-mono">{(p.cases as any)?.case_number}</span>
                <span className="font-semibold">${Number(p.amount_due).toFixed(2)}</span>
                <span className="text-muted-foreground">{format(new Date(p.due_date), "MMM d, yyyy")}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {cases.map((c) => (
          <Link key={c.id} to={`/client/cases/${c.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono font-medium text-sm">{c.case_number}</span>
                  <div className="text-sm text-muted-foreground">
                    {(c.properties as any)?.address_line1}, {(c.properties as any)?.city} — {(c.tenants as any)?.full_name}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
