import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { referralStatusTone, type ReferralStatus } from "@/lib/referrals";

const GROUPS: { key: ReferralStatus; label: string; hint: string }[] = [
  { key: "draft", label: "Draft referrals", hint: "Not yet sent to counsel" },
  { key: "sent", label: "Sent referrals", hint: "Delivered, awaiting acknowledgment" },
  { key: "pending_acceptance", label: "Pending attorney acceptance", hint: "Attorney must accept or decline" },
  { key: "declined", label: "Declined — needs reassignment", hint: "Assign a new attorney" },
  { key: "needs_information", label: "Needs information", hint: "Blocked on a client or staff response" },
  { key: "accepted", label: "Accepted and under review", hint: "Attorney is reviewing the packet" },
];

export default function ReferralsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("attorney_referrals")
      .select(
        "*, cases(case_number, status, clients(company_name), tenants:primary_tenant_id(full_name)), counsel:attorney_id(attorney_name), firms:firm_id(name), referral_packets:referral_packet_id(version)",
      )
      .order("updated_at", { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Attorney referrals</h1>
        <p className="text-sm text-muted-foreground">
          Every referral state change is recorded on the matter timeline.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        GROUPS.map((g) => {
          const list = rows.filter((r) => r.status === g.key);
          if (list.length === 0) return null;
          return (
            <Card key={g.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {g.label}<Badge variant="secondary">{list.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0 text-sm">
                      <div className="font-medium">{r.cases?.case_number}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.cases?.clients?.company_name} · {r.cases?.tenants?.full_name} ·{" "}
                        {r.counsel?.attorney_name || r.firms?.name || "Unassigned"}
                        {r.referral_packets ? ` · Packet v${r.referral_packets.version}` : ""}
                      </div>
                      {r.decline_reason && (
                        <div className="text-xs text-destructive">Declined: {r.decline_reason}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={referralStatusTone(r.status)} className="capitalize text-[10px]">
                        {String(r.status).replace(/_/g, " ")}
                      </Badge>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/cases/${r.case_id}`}>Open matter</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
      {!loading && rows.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No referrals yet.</CardContent></Card>
      )}
    </div>
  );
}
