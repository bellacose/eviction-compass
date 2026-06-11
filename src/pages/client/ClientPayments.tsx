import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  scheduled: "bg-muted text-foreground",
  paid: "bg-status-success/15 text-status-success",
  partial: "bg-status-warning/15 text-status-warning",
  missed: "bg-status-danger/15 text-status-danger",
  waived: "bg-muted text-muted-foreground",
};

const dotColor: Record<string, string> = {
  scheduled: "bg-muted-foreground",
  paid: "bg-status-success",
  partial: "bg-status-warning",
  missed: "bg-status-danger",
  waived: "bg-muted-foreground/50",
};

export default function ClientPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [caseFilter, setCaseFilter] = useState("all");
  const [caseStatusFilter, setCaseStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data: casesData } = await supabase
        .from("cases")
        .select("id, case_number, status, properties(id, address_line1, city)");
      setCases(casesData || []);
      const { data } = await supabase
        .from("scheduled_payments")
        .select("*, cases(id, case_number, status, properties(address_line1, city, id))")
        .order("due_date");
      setPayments(data || []);
    };
    load();
  }, []);

  const properties = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach((c) => {
      const p = (c.properties as any);
      if (p?.id) map.set(p.id, `${p.address_line1}${p.city ? ", " + p.city : ""}`);
    });
    return Array.from(map.entries());
  }, [cases]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const c = p.cases as any;
      if (caseFilter !== "all" && c?.id !== caseFilter) return false;
      if (caseStatusFilter !== "all" && c?.status !== caseStatusFilter) return false;
      if (propertyFilter !== "all" && c?.properties?.id !== propertyFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [payments, caseFilter, caseStatusFilter, propertyFilter, statusFilter]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const arr: Date[] = [];
    let d = start;
    while (d <= end) {
      arr.push(d);
      d = new Date(d.getTime() + 86400000);
    }
    return arr;
  }, [month]);

  const paymentsByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    filtered.forEach((p) => {
      const key = p.due_date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return m;
  }, [filtered]);

  const totals = useMemo(() => {
    const sum = (arr: any[]) => arr.reduce((s, p) => s + Number(p.amount_due || 0), 0);
    const paid = filtered.filter((p) => p.status === "paid");
    const upcoming = filtered.filter((p) => p.status === "scheduled" && new Date(p.due_date) >= new Date());
    const overdue = filtered.filter((p) => p.status === "missed" || (p.status === "scheduled" && new Date(p.due_date) < new Date()));
    return { paid: sum(paid), upcoming: sum(upcoming), overdue: sum(overdue) };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payments</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Paid</div><div className="text-xl font-semibold text-status-success">${totals.paid.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Upcoming</div><div className="text-xl font-semibold">${totals.upcoming.toFixed(2)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-xl font-semibold text-status-danger">${totals.overdue.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2">
          <Select value={caseFilter} onValueChange={setCaseFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Case" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cases</SelectItem>
              {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.case_number}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={caseStatusFilter} onValueChange={setCaseStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Case status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any case status</SelectItem>
              {["intake","pre_filing","filed","served","hearing_scheduled","judgment","writ","completed","closed","dismissed"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Property" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Payment status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {["scheduled","paid","partial","missed","waived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1" /> Calendar</TabsTrigger>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{format(month, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
                <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden text-xs">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="bg-muted p-2 font-medium text-center">{d}</div>
                ))}
                {days.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const items = paymentsByDay.get(key) || [];
                  const inMonth = isSameMonth(d, month);
                  return (
                    <div key={key} className={cn("bg-card min-h-[88px] p-1.5", !inMonth && "bg-muted/30")}>
                      <div className={cn("text-[11px] font-medium mb-1", isSameDay(d, new Date()) && "text-primary")}>{format(d, "d")}</div>
                      <div className="space-y-0.5">
                        {items.slice(0, 3).map((p) => (
                          <Link key={p.id} to={`/client/cases/${p.case_id}`} className={cn("flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate", statusColor[p.status])}>
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor[p.status])} />
                            <span className="truncate">${Number(p.amount_due).toFixed(0)} · {(p.cases as any)?.case_number}</span>
                          </Link>
                        ))}
                        {items.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{items.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0 divide-y">
              {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No payments match these filters.</div>}
              {filtered.map((p) => (
                <Link key={p.id} to={`/client/cases/${p.case_id}`} className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2 w-2 rounded-full", dotColor[p.status])} />
                    <div>
                      <div className="text-sm font-medium">{format(new Date(p.due_date), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground font-mono">{(p.cases as any)?.case_number} · {(p.cases as any)?.properties?.address_line1}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${Number(p.amount_due).toFixed(2)}</span>
                    <Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}