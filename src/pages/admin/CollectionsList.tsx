import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Banknote } from "lucide-react";
import { fmtMoney, statusColor, STATUS_OPTIONS } from "@/lib/collections";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CollectionsList() {
  const [matters, setMatters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("collection_matters")
        .select("*, debtors(full_name, debtor_type), clients(company_name), collection_agencies(name)")
        .order("created_at", { ascending: false });
      setMatters(data || []);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const open = matters.filter((m) => !["paid","written_off"].includes(m.status));
    const principal = open.reduce((s, m) => s + Number(m.principal || 0), 0);
    return { count: matters.length, open: open.length, principal };
  }, [matters]);

  const filtered = matters.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.matter_number?.toLowerCase().includes(q) ||
      m.debtors?.full_name?.toLowerCase().includes(q) ||
      m.clients?.company_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground">Track and recover money owed</p>
        </div>
        <Button asChild><Link to="/admin/collections/new"><Plus className="h-4 w-4 mr-2" />New Matter</Link></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Matters</div><div className="text-2xl font-bold">{kpis.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-bold">{kpis.open}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open Principal</div><div className="text-2xl font-bold font-mono">{fmtMoney(kpis.principal)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by matter #, debtor, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter #</TableHead>
                <TableHead>Debtor</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead className="hidden lg:table-cell">Origin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Agency</TableHead>
                <TableHead className="text-right">Principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />No collection matters yet</TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell><Link to={`/admin/collections/${m.id}`} className="font-mono text-sm font-medium">{m.matter_number}</Link></TableCell>
                  <TableCell>
                    <div className="font-medium">{m.debtors?.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{m.debtors?.debtor_type?.replace(/_/g, " ")}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{m.clients?.company_name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs capitalize text-muted-foreground">{m.origin?.replace(/_/g, " ")}</TableCell>
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