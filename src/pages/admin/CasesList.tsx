import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { PRIORITY_COLORS, STATUS_LABELS } from "@/lib/case-utils";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CasesList() {
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("cases")
        .select("*, clients(company_name), tenants(full_name), properties(address_line1, city)")
        .order("updated_at", { ascending: false });
      setCases(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = cases.filter((c) => {
    const matchesSearch =
      !search ||
      c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
      (c.clients as any)?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      (c.tenants as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (c.properties as any)?.address_line1?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-sm text-muted-foreground">{cases.length} total cases</p>
        </div>
        <Button asChild>
          <Link to="/admin/cases/new"><Plus className="h-4 w-4 mr-2" />New Case</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search cases…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Tenant</TableHead>
                <TableHead className="hidden lg:table-cell">Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cases found</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => window.location.href = `/admin/cases/${c.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{c.case_number}</TableCell>
                    <TableCell>{(c.clients as any)?.company_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{(c.tenants as any)?.full_name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {(c.properties as any)?.address_line1}, {(c.properties as any)?.city}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[c.priority])}>{c.priority}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {c.updated_at ? format(new Date(c.updated_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
