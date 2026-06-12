import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const empty = { name: "", contact_name: "", email: "", phone: "", default_commission_pct: 0, is_active: true, notes: "" };

export default function CollectionAgencies() {
  const [list, setList] = useState<any[]>([]);
  const [dlg, setDlg] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("collection_agencies").select("*").order("name");
    setList(data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast({ title: "Name required", variant: "destructive" });
    const payload = { ...form, default_commission_pct: Number(form.default_commission_pct || 0) };
    if (editing) await supabase.from("collection_agencies").update(payload).eq("id", editing.id);
    else await supabase.from("collection_agencies").insert(payload);
    setDlg(false); setEditing(null); setForm(empty); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collection Agencies</h1>
          <p className="text-sm text-muted-foreground">{list.length} agencies on file</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(empty); setDlg(true); }}><Plus className="h-4 w-4 mr-2" />Add Agency</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Commission %</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.contact_name || "—"}</TableCell>
                  <TableCell>{a.email || "—"}</TableCell>
                  <TableCell>{a.phone || "—"}</TableCell>
                  <TableCell>{a.default_commission_pct}%</TableCell>
                  <TableCell><Badge variant={a.is_active ? "default" : "outline"} className="text-xs">{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(a); setForm({ ...empty, ...a }); setDlg(true); }}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No agencies yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Agency" : "Add Agency"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact</Label><Input value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Default Commission %</Label><Input type="number" step="0.01" value={form.default_commission_pct} onChange={(e) => setForm({ ...form, default_commission_pct: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDlg(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}