import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewCase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyCity, setPropertyCity] = useState("Buffalo");
  const [propertyState, setPropertyState] = useState("NY");
  const [propertyZip, setPropertyZip] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [caseType, setCaseType] = useState("nonpayment");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    supabase.from("clients").select("id, company_name").eq("is_active", true).then(({ data }) => setClients(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !propertyAddress || !tenantName) {
      toast({ title: "Missing fields", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Create property
    const { data: property } = await supabase.from("properties").insert({
      client_id: clientId, address_line1: propertyAddress, city: propertyCity, state: propertyState, zip: propertyZip,
    }).select().single();

    // Create tenant
    const { data: tenant } = await supabase.from("tenants").insert({
      full_name: tenantName, phone: tenantPhone, email: tenantEmail,
    }).select().single();

    if (!property || !tenant) {
      toast({ title: "Error", description: "Failed to create property or tenant", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create case
    const { data: newCase, error } = await supabase.from("cases").insert({
      client_id: clientId, property_id: property.id, primary_tenant_id: tenant.id,
      case_type: caseType, priority: priority as any, assigned_admin_id: user?.id,
    }).select().single();

    if (error || !newCase) {
      toast({ title: "Error", description: error?.message || "Failed to create case", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Link tenant to case
    await supabase.from("case_tenants").insert({ case_id: newCase.id, tenant_id: tenant.id, is_primary: true });

    // Apply default milestone template
    const { data: templateItems } = await supabase
      .from("milestone_template_items")
      .select("*")
      .eq("template_id", "e1b2c3d4-0001-4000-8000-000000000001")
      .order("order_index");

    if (templateItems) {
      let baseDate = new Date();
      const milestones = templateItems.map((item: any) => {
        if (item.auto_offset_days) {
          baseDate = new Date(baseDate.getTime() + item.auto_offset_days * 86400000);
        }
        return {
          case_id: newCase.id,
          milestone_key: item.milestone_key,
          label: item.label,
          order_index: item.order_index,
          due_date: item.auto_offset_days != null ? baseDate.toISOString().split("T")[0] : null,
          client_visible: item.default_client_visible,
          status: "pending" as const,
        };
      });
      await supabase.from("case_milestones").insert(milestones);
      // Auto-complete first milestone
      const firstMilestone = milestones[0];
      if (firstMilestone) {
        await supabase.from("case_milestones")
          .update({ status: "complete", completed_at: new Date().toISOString(), completed_by: user?.id })
          .eq("case_id", newCase.id).eq("order_index", 1);
      }
    }

    toast({ title: "Case created", description: `Case ${newCase.case_number} created successfully` });
    navigate(`/admin/cases/${newCase.id}`);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/cases"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-xl font-bold">New Case</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Client</CardTitle></CardHeader>
          <CardContent>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Property</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Address *</Label><Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} required /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)} /></div>
              <div><Label>State</Label><Input value={propertyState} onChange={(e) => setPropertyState(e.target.value)} /></div>
              <div><Label>ZIP</Label><Input value={propertyZip} onChange={(e) => setPropertyZip(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Tenant</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Full Name *</Label><Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} type="email" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Case Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Case Type</Label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="nonpayment">Nonpayment</SelectItem><SelectItem value="holdover">Holdover</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create Case"}
        </Button>
      </form>
    </div>
  );
}
