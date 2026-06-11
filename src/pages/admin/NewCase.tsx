import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddressAutocomplete from "@/components/AddressAutocomplete";

interface TenantForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  ssn: string;
  dob: string;
}

const emptyTenant = (): TenantForm => ({
  firstName: "", lastName: "", phone: "", email: "", ssn: "", dob: "",
});

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
  const [propertyCounty, setPropertyCounty] = useState("");
  const [tenants, setTenants] = useState<TenantForm[]>([emptyTenant()]);
  const [caseType, setCaseType] = useState("nonpayment");
  const [priority, setPriority] = useState("normal");
  const [militaryVerified, setMilitaryVerified] = useState(false);
  const [evictionReason, setEvictionReason] = useState("unpaid_rent");
  const [evictionReasonOther, setEvictionReasonOther] = useState("");

  useEffect(() => {
    supabase.from("clients").select("id, company_name").eq("is_active", true).then(({ data }) => setClients(data || []));
  }, []);

  const updateTenant = (index: number, field: keyof TenantForm, value: string) => {
    setTenants(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addTenant = () => setTenants(prev => [...prev, emptyTenant()]);

  const removeTenant = (index: number) => {
    if (tenants.length <= 1) return;
    setTenants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstTenant = tenants[0];
    if (!clientId || !propertyAddress || !firstTenant.firstName || !firstTenant.lastName) {
      toast({ title: "Missing fields", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    if (!militaryVerified) {
      toast({ title: "Military verification required", description: "Please confirm tenant(s) are not active military members", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Create property
    const { data: property } = await supabase.from("properties").insert({
      client_id: clientId, address_line1: propertyAddress, city: propertyCity, state: propertyState, zip: propertyZip, county: propertyCounty || null,
    }).select().single();

    if (!property) {
      toast({ title: "Error", description: "Failed to create property", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create all tenants
    const tenantInserts = tenants.map(t => ({
      full_name: `${t.firstName} ${t.lastName}`.trim(),
      first_name: t.firstName || null,
      last_name: t.lastName || null,
      phone: t.phone || null,
      email: t.email || null,
      ssn_last4: t.ssn || null,
      date_of_birth: t.dob || null,
    }));

    const { data: createdTenants } = await supabase.from("tenants").insert(tenantInserts).select();

    if (!createdTenants || createdTenants.length === 0) {
      toast({ title: "Error", description: "Failed to create tenant(s)", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create case
    const { data: newCase, error } = await supabase.from("cases").insert({
      client_id: clientId, property_id: property.id, primary_tenant_id: createdTenants[0].id,
      case_type: caseType, priority: priority as any, assigned_admin_id: user?.id,
      military_verified: militaryVerified,
      eviction_reason: evictionReason,
      eviction_reason_other: evictionReason === "other" ? evictionReasonOther : null,
    }).select().single();

    if (error || !newCase) {
      toast({ title: "Error", description: error?.message || "Failed to create case", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Link all tenants to case
    const caseTenantInserts = createdTenants.map((t, i) => ({
      case_id: newCase.id, tenant_id: t.id, is_primary: i === 0,
    }));
    await supabase.from("case_tenants").insert(caseTenantInserts);

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
          <CardHeader><CardTitle className="text-sm">Client (Plaintiff)</CardTitle></CardHeader>
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
            <div>
              <Label>Address *</Label>
              <AddressAutocomplete
                value={propertyAddress}
                onChange={setPropertyAddress}
                onSelect={(p) => {
                  setPropertyAddress(p.address_line1);
                  if (p.city) setPropertyCity(p.city);
                  if (p.state) setPropertyState(p.state);
                  if (p.zip) setPropertyZip(p.zip);
                  if (p.county) setPropertyCounty(p.county);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)} /></div>
              <div><Label>County</Label><Input value={propertyCounty} onChange={(e) => setPropertyCounty(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>State</Label><Input value={propertyState} onChange={(e) => setPropertyState(e.target.value)} /></div>
              <div><Label>ZIP</Label><Input value={propertyZip} onChange={(e) => setPropertyZip(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tenants</CardTitle>
            <p className="text-xs text-muted-foreground">Add all tenants found on the lease.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenants.map((tenant, index) => (
              <div key={index} className="space-y-3 border rounded-lg p-3 relative">
                {tenants.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTenant(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name *</Label><Input value={tenant.firstName} onChange={(e) => updateTenant(index, "firstName", e.target.value)} required={index === 0} /></div>
                  <div><Label>Last Name *</Label><Input value={tenant.lastName} onChange={(e) => updateTenant(index, "lastName", e.target.value)} required={index === 0} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Phone</Label><Input value={tenant.phone} onChange={(e) => updateTenant(index, "phone", e.target.value)} /></div>
                  <div><Label>SSN (last 4) *</Label><Input value={tenant.ssn} onChange={(e) => updateTenant(index, "ssn", e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} required={index === 0} /></div>
                  <div><Label>Date of Birth *</Label><Input type="date" value={tenant.dob} onChange={(e) => updateTenant(index, "dob", e.target.value)} required={index === 0} /></div>
                </div>
                <div><Label>Email</Label><Input value={tenant.email} onChange={(e) => updateTenant(index, "email", e.target.value)} type="email" /></div>
              </div>
            ))}
            <Button type="button" variant="secondary" className="w-full" onClick={addTenant}>
              <Plus className="h-4 w-4 mr-2" /> Add Another Tenant
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 px-1">
          <Checkbox id="military" checked={militaryVerified} onCheckedChange={(v) => setMilitaryVerified(v === true)} />
          <Label htmlFor="military" className="text-sm leading-snug cursor-pointer">
            Tenant(s) are not active military members.
          </Label>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Case Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Eviction Reason *</Label>
                <Select value={evictionReason} onValueChange={setEvictionReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid_rent">Unpaid Rent</SelectItem>
                    <SelectItem value="holdover">Holdover</SelectItem>
                    <SelectItem value="lease_violation">Lease Violation</SelectItem>
                    <SelectItem value="nuisance">Nuisance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {evictionReason === "other" && (
                <div><Label>Other Reason</Label><Input value={evictionReasonOther} onChange={(e) => setEvictionReasonOther(e.target.value)} placeholder="Describe reason" /></div>
              )}
            </div>
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
