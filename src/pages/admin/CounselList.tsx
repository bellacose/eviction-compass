import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Counsel {
  id: string;
  firm_name: string | null;
  attorney_name: string;
  email: string | null;
  phone: string | null;
  bar_number: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  case_count?: number;
}

const empty: Omit<Counsel, "id" | "created_at" | "case_count"> = {
  firm_name: "",
  attorney_name: "",
  email: "",
  phone: "",
  bar_number: "",
  address: "",
  notes: "",
  is_active: true,
};

export default function CounselList() {
  const [counselList, setCounselList] = useState<Counsel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Counsel | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data: counselData } = await supabase
      .from("counsel")
      .select("*")
      .order("attorney_name");

    // Get case counts
    const { data: assignments } = await supabase
      .from("case_counsel")
      .select("counsel_id");

    const counts: Record<string, number> = {};
    (assignments || []).forEach((a: any) => {
      counts[a.counsel_id] = (counts[a.counsel_id] || 0) + 1;
    });

    setCounselList(
      (counselData || []).map((c: any) => ({ ...c, case_count: counts[c.id] || 0 }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (c: Counsel) => {
    setEditing(c);
    setForm({
      firm_name: c.firm_name || "",
      attorney_name: c.attorney_name,
      email: c.email || "",
      phone: c.phone || "",
      bar_number: c.bar_number || "",
      address: c.address || "",
      notes: c.notes || "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.attorney_name.trim()) {
      toast({ title: "Attorney name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      attorney_name: form.attorney_name.trim(),
      firm_name: form.firm_name?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      bar_number: form.bar_number?.trim() || null,
      address: form.address?.trim() || null,
      notes: form.notes?.trim() || null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("counsel").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error updating counsel", description: error.message, variant: "destructive" });
      else toast({ title: "Counsel updated" });
    } else {
      const { error } = await supabase.from("counsel").insert(payload);
      if (error) toast({ title: "Error adding counsel", description: error.message, variant: "destructive" });
      else toast({ title: "Counsel added" });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const filtered = counselList.filter((c) => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.attorney_name.toLowerCase().includes(q) ||
      c.firm_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.bar_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Counsel Directory</h1>
          <p className="text-sm text-muted-foreground">
            {counselList.length} attorney{counselList.length !== 1 ? "s" : ""} on file
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />Add Counsel
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, firm, email, or bar number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attorney</TableHead>
                <TableHead className="hidden md:table-cell">Firm</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Bar #</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No counsel found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.attorney_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.firm_name || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.phone || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{c.bar_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.case_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "outline"} className="text-xs">
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Counsel" : "Add Counsel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Attorney Name *</Label>
                <Input value={form.attorney_name} onChange={(e) => setForm({ ...form, attorney_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Firm Name</Label>
                <Input value={form.firm_name || ""} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bar Number</Label>
                <Input value={form.bar_number || ""} onChange={(e) => setForm({ ...form, bar_number: e.target.value })} />
              </div>
              <div className="space-y-1.5 flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
