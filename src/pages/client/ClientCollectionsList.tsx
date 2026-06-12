import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote } from "lucide-react";
import { fmtMoney, statusColor } from "@/lib/collections";

export default function ClientCollectionsList() {
  const [matters, setMatters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("collection_matters")
        .select("*, debtors(full_name, debtor_type), collection_agencies(name)")
        .order("created_at", { ascending: false });
      setMatters(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground">Money owed and recovery status</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Matter #</TableHead><TableHead>Debtor</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Agency</TableHead><TableHead className="text-right">Principal</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                : matters.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground"><Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />No collections yet</TableCell></TableRow>
                : matters.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><Link to={`/client/collections/${m.id}`} className="font-mono text-sm font-medium">{m.matter_number}</Link></TableCell>
                    <TableCell><div className="font-medium">{m.debtors?.full_name}</div><div className="text-xs text-muted-foreground capitalize">{m.debtors?.debtor_type?.replace(/_/g, " ")}</div></TableCell>
                    <TableCell><Badge className={`text-xs capitalize ${statusColor(m.status)}`} variant="outline">{m.status?.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{m.collection_agencies?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(m.principal)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}