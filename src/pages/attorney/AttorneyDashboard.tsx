import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { loadAssignedMatters, type AttorneyMatterRow } from "./AttorneyMatters";
import { Briefcase, Gavel, PauseCircle, ClipboardCheck } from "lucide-react";

export default function AttorneyDashboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AttorneyMatterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedMatters()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const awaitingReview = rows.filter((r) => r.status === "attorney_review");
  const onHold = rows.filter((r) => r.is_on_hold);
  const readyToFile = rows.filter((r) => r.status === "ready_to_file");

  const cards = [
    { label: "Assigned matters", value: rows.length, icon: Briefcase },
    { label: "Awaiting legal review", value: awaitingReview.length, icon: ClipboardCheck },
    { label: "Ready to file", value: readyToFile.length, icon: Gavel },
    { label: "On hold", value: onHold.length, icon: PauseCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attorney Queue</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.full_name ? `Signed in as ${profile.full_name}. ` : ""}
          You only see matters assigned to you or your firm.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-1">{loading ? "—" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Needs your attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : awaitingReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is waiting on legal review right now.</p>
          ) : (
            awaitingReview.map((r) => (
              <Link
                key={r.id}
                to={`/attorney/matters/${r.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">{r.case_number}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.tenants?.full_name || "Unknown tenant"}
                    {r.properties ? ` · ${r.properties.address_line1}, ${r.properties.city}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_on_hold && <Badge variant="destructive" className="text-[10px]">On hold</Badge>}
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}