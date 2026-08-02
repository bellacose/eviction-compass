import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileCheck, Calendar, AlertTriangle, Hourglass } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { NOTICE_KIND_LABELS, currency } from "@/lib/notices";
import NextActionsList from "@/components/matter/NextActionsList";

interface KPIs {
  openCases: number;
  readyToFile: number;
  upcomingCourt: number;
  overdueMilestones: number;
  ripeToFile: number;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs>({ openCases: 0, readyToFile: 0, upcomingCourt: 0, overdueMilestones: 0, ripeToFile: 0 });
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [casesRes, milestoneRes, courtRes, noticesRes] = await Promise.all([
        supabase.from("cases").select("id, case_number, status, priority, opened_date, updated_at, clients(company_name), tenants(full_name)").order("updated_at", { ascending: false }).limit(10),
        supabase.from("case_milestones").select("id").eq("status", "overdue"),
        supabase.from("court_events").select("id").gte("start_at", new Date().toISOString()),
        supabase
          .from("notices")
          .select("id, case_id, notice_kind, status, amount_demanded, cure_by_date, eligible_to_file_date, cases(case_number, clients(company_name), tenants(full_name))")
          .not("cure_by_date", "is", null)
          .in("status", ["issued", "served", "cure_running", "ripe"])
          .order("cure_by_date", { ascending: true })
          .limit(15),
      ]);

      const cases = casesRes.data || [];
      const openStatuses = ["intake", "notice_preparation", "notice_served", "waiting_period", "ready_to_file", "filed", "court_scheduled", "in_court_process", "outcome_pending"];
      const openCases = cases.filter((c: any) => openStatuses.includes(c.status)).length;
      const readyToFile = cases.filter((c: any) => c.status === "ready_to_file").length;
      const notices = noticesRes.data || [];
      const ripeToFile = notices.filter((n: any) => n.eligible_to_file_date && n.eligible_to_file_date <= todayStr).length;

      setKpis({
        openCases,
        readyToFile,
        upcomingCourt: courtRes.data?.length || 0,
        overdueMilestones: milestoneRes.data?.length || 0,
        ripeToFile,
      });
      setRecentCases(cases);
      setDeadlines(notices);
      setLoading(false);
    };
    load();
  }, []);

  const kpiCards = [
    { label: "Open Cases", value: kpis.openCases, icon: Briefcase, color: "text-primary" },
    { label: "Ready to File", value: kpis.readyToFile, icon: FileCheck, color: "text-status-success" },
    { label: "Upcoming Court", value: kpis.upcomingCourt, icon: Calendar, color: "text-status-warning" },
    { label: "Overdue Milestones", value: kpis.overdueMilestones, icon: AlertTriangle, color: "text-status-danger" },
    { label: "Ripe to File", value: kpis.ripeToFile, icon: Hourglass, color: "text-status-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your eviction case pipeline</p>
      </div>

      <NextActionsList basePath="/cases" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          <CardTitle className="text-base">Notice Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : deadlines.length === 0 ? (
            <p className="text-muted-foreground text-sm">No served notices with a running cure period.</p>
          ) : (
            <div className="space-y-2">
              {deadlines.map((n: any) => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const ripe = n.eligible_to_file_date && n.eligible_to_file_date <= todayStr;
                return (
                  <Link
                    key={n.id}
                    to={`/admin/cases/${n.case_id}`}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <span className="font-mono text-sm font-medium">{(n.cases as any)?.case_number}</span>
                    <span className="text-sm">{NOTICE_KIND_LABELS[n.notice_kind] ?? n.notice_kind}</span>
                    <span className="text-sm text-muted-foreground">{(n.cases as any)?.tenants?.full_name}</span>
                    <span className="text-sm font-mono ml-auto">{currency(n.amount_demanded)}</span>
                    <span className="text-xs text-muted-foreground">
                      Cure by {n.cure_by_date ? format(new Date(n.cure_by_date), "MMM d") : "—"}
                    </span>
                    <Badge variant={ripe ? "destructive" : "outline"} className="text-[10px]">
                      {ripe ? "Ripe to file" : "Cure running"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
