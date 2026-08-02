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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Scale, Mail, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { statusTone, type AttorneyStatus } from "@/lib/attorney";

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
  user_id: string | null;
  status: AttorneyStatus;
  firm_id: string | null;
  is_firm_admin: boolean;
  case_count?: number;
}

interface Firm {
  id: string;
  name: string;
}

const NO_FIRM = "__none__";

const empty = {
  firm_name: "",
  attorney_name: "",
  email: "",
  phone: "",
  bar_number: "",
  address: "",
  notes: "",
  is_active: true,
  firm_id: NO_FIRM,
  is_firm_admin: false,
};

export default function CounselList() {
  const [counselList, setCounselList] = useState<Counsel[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Counsel | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [firmDialogOpen, setFirmDialogOpen] = useState(false);
  const [firmName, setFirmName] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data: counselData } = await supabase
      .from("counsel")
      .select("*")
      .order("attorney_name");

    const { data: firmData } = await supabase.from("firms").select("id, name").order("name");
    setFirms((firmData || []) as Firm[]);

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
      firm_id: c.firm_id || NO_FIRM,
      is_firm_admin: c.is_firm_admin,
    });
    setDialogOpen(true);
  };

  const createFirm = async () => {
    if (!firmName.trim()) return;
    const { error } = await supabase.from("firms").insert({ name: firmName.trim() });
    if (error) {
      toast({ title: "Could not create firm", description: error.message, variant: "destructive" });
      return;
    }
    setFirmName("");
    setFirmDialogOpen(false);
    toast({ title: "Firm added" });
    load();
  };

  const invite = async (c: Counsel) => {
    if (!c.email) {
      toast({ title: "Add an email address first", variant: "destructive" });
      return;
    }
    setInviting(c.id);
    const { data, error } = await supabase.functions.invoke("invite-attorney", {
      body: { counsel_id: c.id },
    });
    setInviting(null);
    if (error || (data as any)?.error) {
      toast({
        title: "Invitation failed",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Portal invitation sent", description: `${c.attorney_name} was invited at ${c.email}` });
    load();
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
      firm_id: form.firm_id === NO_FIRM ? null : form.firm_id,
      is_firm_admin: form.is_firm_admin,
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFirmDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />Add Firm
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />Add Counsel
          </Button>
        </div>
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
                <TableHead>Portal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No counsel found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.attorney_name}
                      {c.is_firm_admin && <Badge variant="outline" className="ml-2 text-[10px]">Firm admin</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {firms.find((f) => f.id === c.firm_id)?.name || c.firm_name || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.phone || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{c.bar_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.case_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(c.status)} className="text-xs capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "outline"} className="text-xs">
                        {c.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {!c.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Invite to attorney portal"
                            disabled={inviting === c.id}
                            onClick={() => invite(c)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
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
                <Label>Firm</Label>
                <Select value={form.firm_id} onValueChange={(v) => setForm({ ...form, firm_id: v })}>
                  <SelectTrigger><SelectValue placeholder="No firm" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FIRM}>No firm (solo)</SelectItem>
                    {firms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={form.is_firm_admin}
                    onCheckedChange={(v) => setForm({ ...form, is_firm_admin: v })}
                  />
                  <Label>Firm administrator</Label>
                </div>
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

      <Dialog open={firmDialogOpen} onOpenChange={setFirmDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Firm</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Firm name</Label>
            <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Smith & Associates" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={createFirm} disabled={!firmName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
