import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { StepProps } from "./types";

export default function StepClient({ clientId, setClientId, next, isAdmin }: StepProps) {
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, company_name")
      .eq("is_active", true)
      .order("company_name")
      .then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    if (!isAdmin && !clientId && clients.length === 1) setClientId(clients[0].id);
  }, [isAdmin, clientId, clients, setClientId]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 1 — Client (Plaintiff)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={setClientId} disabled={!isAdmin && clients.length <= 1}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The landlord or management company this matter belongs to.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={next} disabled={!clientId}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
