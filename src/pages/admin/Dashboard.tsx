import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileCheck, Calendar, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";

interface KPIs {
  openCases: number;
  readyToFile: number;
  upcomingCourt: number;
  overdueMilestones: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs>({ openCases: 0, readyToFile: 0, upcomingCourt: 0, overdueMilestones: 0 });
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [casesRes, milestoneRes, courtRes] = await Promise.all([
        supabase.from("cases").select("id, case_number, status, priority, opened_date, updated_at, clients(company_name), tenants(full_name)").order("updated_at", { ascending: false }).limit(10),
        supabase.from("case_milestones").select("id").eq("status", "overdue"),
        supabase.from("court_events").select("id").gte("start_at", new Date().toISOString()),
      ]);

      const cases = casesRes.data || [];
      const openStatuses = ["intake", "notice_preparation", "notice_served", "waiting_period", "ready_to_file", "filed", "court_scheduled", "in_court_process", "outcome_pending"];
      const openCases = cases.filter((c: any) => openStatuses.includes(c.status)).length;
      const readyToFile = cases.filter((c: any) => c.status === "ready_to_file").length;

      setKpis({
        openCases,
        readyToFile,
        upcomingCourt: courtRes.data?.length || 0,
        overdueMilestones: milestoneRes.data?.length || 0,
      });
      setRecentCases(cases);
      setLoading(false);
    };
    load();
  }, []);

  const kpiCards = [
    { label: "Open Cases", value: kpis.openCases, icon: Briefcase, color: "text-primary" },
    { label: "Ready to File", value: kpis.readyToFile, icon: FileCheck, color: "text-status-success" },
    { label: "Upcoming Court", value: kpis.upcomingCourt, icon: Calendar, color: "text-status-warning" },
    { label: "Overdue Milestones", value: kpis.overdueMilestones, icon: AlertTriangle, color: "text-status-danger" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your eviction case pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "—" : k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <div className="space-y-2">
              {recentCases.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/admin/cases/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{c.case_number}</span>
                    <span className="text-sm text-muted-foreground">{(c.clients as any)?.company_name}</span>
                    <span className="text-sm">— {(c.tenants as any)?.full_name}</span>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
