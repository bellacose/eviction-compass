import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [disclaimer, setDisclaimer] = useState("");
  const [noticeDays, setNoticeDays] = useState("14");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("system_settings").select("*");
      const map: Record<string, any> = {};
      data?.forEach((s: any) => { map[s.setting_key] = s.setting_value_json; });
      setSettings(map);
      setDisclaimer(typeof map.legal_disclaimer === "string" ? map.legal_disclaimer : JSON.stringify(map.legal_disclaimer || ""));
      const defaults = map.jurisdiction_defaults || {};
      setNoticeDays(String(defaults.default_notice_days || 14));
    };
    load();
  }, []);

  const saveDisclaimer = async () => {
    await supabase.from("system_settings").update({ setting_value_json: disclaimer }).eq("setting_key", "legal_disclaimer");
    toast({ title: "Disclaimer saved" });
  };

  const saveDefaults = async () => {
    const current = settings.jurisdiction_defaults || {};
    const updated = { ...current, default_notice_days: parseInt(noticeDays) };
    await supabase.from("system_settings").update({ setting_value_json: updated }).eq("setting_key", "jurisdiction_defaults");
    toast({ title: "Defaults saved" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="border-status-warning/30 bg-status-warning/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Legal Compliance Notice</p>
            <p className="text-muted-foreground">All legal workflows must be reviewed by counsel. This software is for case tracking and communication only.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Jurisdiction Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Default Notice Days</Label>
            <Input type="number" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} className="w-32" />
          </div>
          <Button size="sm" onClick={saveDefaults}>Save Defaults</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Legal Disclaimer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} rows={4} />
          <Button size="sm" onClick={saveDisclaimer}>Save Disclaimer</Button>
        </CardContent>
      </Card>
    </div>
  );
}
