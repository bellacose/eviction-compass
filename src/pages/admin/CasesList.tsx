import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { PRIORITY_COLORS, STATUS_LABELS } from "@/lib/case-utils";
import { Plus, Search, X, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
type SortColumn = "case_number" | "client" | "tenant" | "property" | "status" | "priority" | "updated" | null;

export default function CasesList() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openClosedFilter, setOpenClosedFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [overdueCaseIds, setOverdueCaseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn>("updated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const load = async () => {
      const [casesRes, clientsRes, overdueRes] = await Promise.all([
        supabase
          .from("cases")
          .select("*, clients(company_name), tenants(full_name), properties(address_line1, city)")
          .order("updated_at", { ascending: false }),
        supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name"),
        supabase.from("case_milestones").select("case_id").eq("status", "overdue"),
      ]);
      setCases(casesRes.data || []);
      setClients(clientsRes.data || []);
      const ids = new Set<string>((overdueRes.data || []).map((m: any) => m.case_id));
      setOverdueCaseIds(ids);
      setLoading(false);
    };
    load();
  }, []);

  const hasActiveFilters = statusFilter !== "all" || clientFilter !== "all" || priorityFilter !== "all" || overdueOnly || openClosedFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setClientFilter("all");
    setPriorityFilter("all");
    setOverdueOnly(false);
    setOpenClosedFilter("all");
  };

  const isClosed = (status: string) => ["resolved", "closed"].includes(status);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/60" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      c.case_number?.toLowerCase().includes(q) ||
      (c.clients as any)?.company_name?.toLowerCase().includes(q) ||
      (c.tenants as any)?.full_name?.toLowerCase().includes(q) ||
      (c.properties as any)?.address_line1?.toLowerCase().includes(q) ||
      (c.properties as any)?.city?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesClient = clientFilter === "all" || c.client_id === clientFilter;
    const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;
    const matchesOverdue = !overdueOnly || overdueCaseIds.has(c.id);
    const matchesOpenClosed = 
      openClosedFilter === "all" || 
      (openClosedFilter === "open" && !isClosed(c.status)) ||
      (openClosedFilter === "closed" && isClosed(c.status));
    
    return matchesSearch && matchesStatus && matchesClient && matchesPriority && matchesOverdue && matchesOpenClosed;
  });

  const priorityOrder: Record<string, number> = { low: 0, normal: 1, high: 2 };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let cmp = 0;
    switch (sortColumn) {
      case "case_number":
        cmp = (a.case_number || "").localeCompare(b.case_number || "");
        break;
      case "client":
        cmp = ((a.clients as any)?.company_name || "").localeCompare((b.clients as any)?.company_name || "");
        break;
      case "tenant":
        cmp = ((a.tenants as any)?.full_name || "").localeCompare((b.tenants as any)?.full_name || "");
        break;
      case "property": {
        const aProp = `${(a.properties as any)?.address_line1 || ""} ${(a.properties as any)?.city || ""}`;
        const bProp = `${(b.properties as any)?.address_line1 || ""} ${(b.properties as any)?.city || ""}`;
        cmp = aProp.localeCompare(bProp);
        break;
      }
      case "status":
        cmp = (a.status || "").localeCompare(b.status || "");
        break;
      case "priority":
        cmp = (priorityOrder[a.priority] ?? 0) - (priorityOrder[b.priority] ?? 0);
        break;
      case "updated":
        cmp = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-sm text-muted-foreground">{cases.length} total cases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/cases/new"><Plus className="h-4 w-4 mr-2" />Quick Case</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/matters/new"><Plus className="h-4 w-4 mr-2" />New Matter</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by case ID, client, tenant, or address…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-muted/50 p-1 rounded-md border">
              <Button 
                variant={openClosedFilter === "all" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setOpenClosedFilter("all")}
                className="h-7 text-xs px-2"
              >
                All
              </Button>
              <Button 
                variant={openClosedFilter === "open" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setOpenClosedFilter("open")}
                className="h-7 text-xs px-2"
              >
                Open
              </Button>
              <Button 
                variant={openClosedFilter === "closed" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setOpenClosedFilter("closed")}
                className="h-7 text-xs px-2"
              >
                Closed
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>{cl.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="overdue-only" checked={overdueOnly} onCheckedChange={(v) => setOverdueOnly(!!v)} />
              <Label htmlFor="overdue-only" className="text-sm flex items-center gap-1 cursor-pointer">
                <AlertTriangle className="h-3.5 w-3.5 text-status-danger" />
                Overdue only
              </Label>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-3.5 w-3.5 mr-1" />Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("case_number")}>
                  <span className="inline-flex items-center">Case ID<SortIcon column="case_number" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("client")}>
                  <span className="inline-flex items-center">Client<SortIcon column="client" /></span>
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("tenant")}>
                  <span className="inline-flex items-center">Tenant<SortIcon column="tenant" /></span>
                </TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort("property")}>
                  <span className="inline-flex items-center">Property<SortIcon column="property" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center">Status<SortIcon column="status" /></span>
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("priority")}>
                  <span className="inline-flex items-center">Priority<SortIcon column="priority" /></span>
                </TableHead>
                <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort("updated")}>
                  <span className="inline-flex items-center">Updated<SortIcon column="updated" /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cases found</TableCell></TableRow>
              ) : (
                sorted.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(c.status === "draft" ? `/admin/matters/${c.id}` : `/admin/cases/${c.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        {c.case_number}
                        {overdueCaseIds.has(c.id) && <AlertTriangle className="h-3.5 w-3.5 text-status-danger" />}
                      </div>
                    </TableCell>
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
      <p className="text-xs text-muted-foreground text-right">{sorted.length} of {cases.length} cases shown</p>
    </div>
  );
}
