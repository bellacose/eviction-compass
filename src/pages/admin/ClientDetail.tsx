import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, UserCheck, UserX } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type Profile = Tables<"profiles">;

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    is_active: true,
  });

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "" });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadClient();
    loadUsers();
  }, [id]);

  async function loadClient() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id!)
      .single();
    if (error) {
      toast({ title: "Error loading client", description: error.message, variant: "destructive" });
      navigate("/admin/clients");
      return;
    }
    setClient(data);
    setForm({
      company_name: data.company_name || "",
      contact_name: data.contact_name || "",
      email: data.email || "",
      phone: data.phone || "",
      address_line1: data.address_line1 || "",
      address_line2: data.address_line2 || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
      is_active: data.is_active,
    });
    setLoading(false);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("client_id", id!)
      .order("full_name");
    setUsers(data || []);
  }

  async function handleSave() {
    if (!form.company_name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        is_active: form.is_active,
      })
      .eq("id", id!);
    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Client updated" });
      loadClient();
    }
  }

  async function handleInvite() {
    if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: inviteForm.email.trim(),
        full_name: inviteForm.full_name.trim(),
        client_id: id,
      },
    });
    setInviting(false);
    if (error || data?.error) {
      toast({
        title: "Invitation failed",
        description: data?.error || error?.message || "Unknown error",
        variant: "destructive",
      });
    } else {
      toast({ title: "User invited", description: "They will receive an email to set their password." });
      setInviteOpen(false);
      setInviteForm({ full_name: "", email: "" });
      loadUsers();
    }
  }

  async function toggleUserActive(userId: string, currentActive: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !currentActive })
      .eq("id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadUsers();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{client?.company_name}</h1>
        <Badge variant={form.is_active ? "default" : "secondary"}>
          {form.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Client Info Form */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portal Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Portal Users</CardTitle>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Client Portal User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="jane@company.com"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  The user will receive an email to set their password and access the client portal.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button onClick={handleInvite} disabled={inviting}>
                    {inviting ? "Inviting…" : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No portal users yet. Invite one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleUserActive(u.id, u.is_active)}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
