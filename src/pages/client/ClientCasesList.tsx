import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { Search } from "lucide-react";

export default function ClientCasesList() {
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("cases")
      .select("id, case_number, status, updated_at, properties(address_line1, city), tenants(full_name)")
      .order("updated_at", { ascending: false })
      .then(({ data }) => setCases(data || []));
  }, []);

  const filtered = cases.filter((c) =>
    !search ||
    c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
    (c.tenants as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.properties as any)?.address_line1?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Cases</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search cases…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid gap-3">
        {filtered.map((c) => (
          <Link key={c.id} to={`/client/cases/${c.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono font-medium text-sm">{c.case_number}</span>
                  <div className="text-sm text-muted-foreground">
                    {(c.properties as any)?.address_line1}, {(c.properties as any)?.city} — {(c.tenants as any)?.full_name}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
