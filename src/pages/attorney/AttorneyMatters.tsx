import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { Search, Scale } from "lucide-react";

export interface AttorneyMatterRow {
  id: string;
  case_number: string;
  status: string;
  matter_type: string | null;
  current_balance: number | null;
  is_on_hold: boolean;
  properties: { address_line1: string; city: string; state: string } | null;
  tenants: { full_name: string } | null;
}

export async function loadAssignedMatters(): Promise<AttorneyMatterRow[]> {
  // RLS restricts this to matters assigned to the attorney or their firm.
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, case_number, status, matter_type, current_balance, is_on_hold, properties(address_line1, city, state), tenants:primary_tenant_id(full_name)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as AttorneyMatterRow[];
}

export default function AttorneyMatters() {
  const [rows, setRows] = useState<AttorneyMatterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAssignedMatters()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      !q ||
      r.case_number.toLowerCase().includes(q) ||
      r.tenants?.full_name?.toLowerCase().includes(q) ||
      r.properties?.address_line1?.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Assigned Matters</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} matter{rows.length !== 1 ? "s" : ""} assigned to you or your firm
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by matter number, tenant, or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead className="hidden md:table-cell">Property</TableHead>
                <TableHead className="hidden lg:table-cell">Tenant</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No matters are currently assigned to you
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link className="hover:underline" to={`/attorney/matters/${r.id}`}>{r.case_number}</Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.properties ? `${r.properties.address_line1}, ${r.properties.city} ${r.properties.state}` : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{r.tenants?.full_name || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell capitalize">
                      {r.matter_type?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell>${Number(r.current_balance || 0).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={r.status as any} /></TableCell>
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