import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { activateAttorneyAccount, PORTAL_TERMS_VERSION } from "@/lib/attorney";
import { Scale, LogOut } from "lucide-react";

export default function AttorneyActivate() {
  const { attorney, profile, refreshAttorney, signOut } = useAuth();
  const { toast } = useToast();
  const [barNumber, setBarNumber] = useState("");
  const [jurisdictions, setJurisdictions] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const activate = async () => {
    setSaving(true);
    try {
      await activateAttorneyAccount({
        accepted,
        barNumber,
        barJurisdictions: jurisdictions
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      });
      await refreshAttorney();
      toast({ title: "Portal activated", description: "Your assigned matters are now available." });
    } catch (e: any) {
      toast({ title: "Activation failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Scale className="h-5 w-5" />
            <span className="font-bold">Evict OS</span>
          </div>
          <CardTitle>Activate your attorney portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            {profile?.full_name ? `${profile.full_name}, your` : "Your"} account is linked but not yet
            active. Confirm your details and accept the portal terms to see matters assigned to you.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!attorney && (
            <p className="text-sm text-destructive">
              No counsel record is linked to this sign-in. Ask the administrator to re-send your invitation.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Bar number</Label>
            <Input value={barNumber} onChange={(e) => setBarNumber(e.target.value)} placeholder="Optional if already on file" />
          </div>
          <div className="space-y-1.5">
            <Label>Licensed jurisdictions</Label>
            <Input
              value={jurisdictions}
              onChange={(e) => setJurisdictions(e.target.value)}
              placeholder="NY, NJ"
            />
            <p className="text-xs text-muted-foreground">Comma separated state codes.</p>
          </div>

          <div className="rounded-lg border p-3 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Portal terms (version {PORTAL_TERMS_VERSION})</p>
            <p>
              Matter content is confidential and may be privileged. You will only access matters assigned
              to you or your firm, will not share credentials, and will keep matter data within this system.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
            <Label htmlFor="accept" className="text-sm font-normal leading-snug">
              I accept the portal terms and confirm I am authorized to act as counsel on assigned matters.
            </Label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />Sign out
            </Button>
            <Button onClick={activate} disabled={!accepted || saving || !attorney}>
              {saving ? "Activating…" : "Activate portal"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}