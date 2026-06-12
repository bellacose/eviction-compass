import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fetchMatterBalance, fmtMoney, statusColor, MatterBalance } from "@/lib/collections";

export default function ClientCollectionDetail() {
  const { id } = useParams();
  const [matter, setMatter] = useState<any>(null);
  const [balance, setBalance] = useState<MatterBalance | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [m, a, p] = await Promise.all([
        supabase.from("collection_matters").select("*, debtors(full_name, debtor_type), collection_agencies(name), cases(case_number)").eq("id", id).single(),
        supabase.from("collection_activities").select("*").eq("matter_id", id).eq("is_internal", false).order("activity_at", { ascending: false }),
        supabase.from("collection_payments").select("*").eq("matter_id", id).order("payment_date", { ascending: false }),
      ]);
      setMatter(m.data); setActivities(a.data || []); setPayments(p.data || []);
      setBalance(await fetchMatterBalance(id));
    })();
  }, [id]);

  if (!matter) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/client/collections"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{matter.matter_number}</h1>
            <Badge className={`text-xs capitalize ${statusColor(matter.status)}`} variant="outline">{matter.status?.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{matter.debtors?.full_name}{matter.cases?.case_number && <> · Case {matter.cases.case_number}</>}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Principal</div><div className="font-mono font-medium">{fmtMoney(balance?.principal)}</div></div>
          <div><div className="text-xs text-muted-foreground">Costs + Fees</div><div className="font-mono font-medium">{fmtMoney((balance?.court_costs || 0) + (balance?.legal_fees || 0))}</div></div>
          <div><div className="text-xs text-muted-foreground">Accrued Interest</div><div className="font-mono font-medium">{fmtMoney(balance?.accrued_interest)}</div></div>
          <div><div className="text-xs text-muted-foreground">Payments</div><div className="font-mono font-medium">−{fmtMoney(balance?.payments_total)}</div></div>
          <div className="col-span-2 md:col-span-4 pt-3 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance Due</span>
            <span className="text-2xl font-bold font-mono">{fmtMoney(balance?.balance_due)}</span>
          </div>
        </CardContent>
      </Card>

      {matter.collection_agencies?.name && (
        <Card><CardHeader><CardTitle className="text-sm">Agency</CardTitle></CardHeader>
          <CardContent className="text-sm">{matter.collection_agencies.name}</CardContent></Card>
      )}

      {payments.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0 text-sm">
                <span className="text-muted-foreground w-28">{format(new Date(p.payment_date), "MMM d, yyyy")}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{p.payment_type?.replace(/_/g, " ")}</Badge>
                <span className="flex-1 truncate text-muted-foreground">{p.notes}</span>
                <span className="font-mono font-medium">{fmtMoney(p.amount)}</span>
              </div>
            ))}
          </CardContent></Card>
      )}

      {activities.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Updates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize text-[10px]">{a.activity_type?.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(a.activity_at), "MMM d, yyyy h:mm a")}</span>
                </div>
                <p className="whitespace-pre-wrap">{a.content}</p>
              </div>
            ))}
          </CardContent></Card>
      )}
    </div>
  );
}