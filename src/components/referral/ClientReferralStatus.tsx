import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { clientSafeReferralStatus, type ReferralStatus } from "@/lib/referrals";
import { Scale } from "lucide-react";

/**
 * Client-facing referral status only. Attorney identity, fee terms, decline
 * detail and internal notes are never rendered here.
 */
export default function ClientReferralStatus({ caseId }: { caseId: string }) {
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("attorney_referrals")
      .select("status, client_visible_status, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setStatus(data.status as ReferralStatus);
        setLabel(data.client_visible_status || clientSafeReferralStatus(data.status as ReferralStatus));
      });
  }, [caseId]);

  if (!status) return null;

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Scale className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Legal review</span>
        <Badge variant="secondary">{label}</Badge>
      </CardContent>
    </Card>
  );
}
