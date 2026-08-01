import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { NOTICE_KINDS, NOTICE_KIND_LABELS } from "@/lib/notices";

const blank = {
  jurisdiction_state: "NY",
  jurisdiction_county: "*",
  notice_kind: "fourteen_day_demand",
  cure_days: 14,
  count_business_days: false,
  mailing_days: 5,
  min_days_before_filing: 0,
};

export default function NoticeRulesPanel() {
  const { toast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notice_rules")
      .select("*")
      .order("jurisdiction_state")
      .order("jurisdiction_county")
      .order("notice_kind");
    setRules(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addRule = async () => {
    setSaving(true);
    const { error } = await supabase.from("notice_rules").insert({
      jurisdiction_state: form.jurisdiction_state.trim().toUpperCase(),
      jurisdiction_county: form.jurisdiction_county.trim() || "*",
      notice_kind: form.notice_kind as any,
      cure_days: Number(form.cure_days),
      count_business_days: form.count_business_days,
      min_days_before_filing: Number(form.min_days_before_filing),
      mailing_days_json: { certified_mail: Number(form.mailing_days), other: 0 },
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save rule", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ ...blank });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await supabase.from("notice_rules").update(values).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    await supabase.from("notice_rules").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Notice Rules &amp; Deadline Math</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cure-by and eligible-to-file dates are derived from these rules. Use <code>*</code> as the county for a statewide default.
        </p>

        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">{NOTICE_KIND_LABELS[r.notice_kind] ?? r.notice_kind}</span>
                <span className="text-muted-foreground">{r.jurisdiction_state} / {r.jurisdiction_county}</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Cure days
                  <Input
                    className="h-8 w-16"
                    type="number"
                    defaultValue={r.cure_days}
                    onBlur={(e) => Number(e.target.value) !== r.cure_days && patch(r.id, { cure_days: Number(e.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Mail days
                  <Input
                    className="h-8 w-16"
                    type="number"
                    defaultValue={Number(r.mailing_days_json?.certified_mail ?? 0)}
                    onBlur={(e) =>
                      patch(r.id, {
                        mailing_days_json: { ...(r.mailing_days_json || {}), certified_mail: Number(e.target.value), other: 0 },
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Extra days before filing
                  <Input
                    className="h-8 w-16"
                    type="number"
                    defaultValue={r.min_days_before_filing}
                    onBlur={(e) =>
                      Number(e.target.value) !== r.min_days_before_filing &&
                      patch(r.id, { min_days_before_filing: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={r.count_business_days}
                    onCheckedChange={(c) => patch(r.id, { count_business_days: c === true })}
                  />
                  Business days
                </label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Delete rule">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Input value={form.jurisdiction_state} onChange={(e) => setForm({ ...form, jurisdiction_state: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">County</Label>
            <Input value={form.jurisdiction_county} onChange={(e) => setForm({ ...form, jurisdiction_county: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Notice type</Label>
            <Select value={form.notice_kind} onValueChange={(v) => setForm({ ...form, notice_kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTICE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cure days</Label>
            <Input type="number" value={form.cure_days} onChange={(e) => setForm({ ...form, cure_days: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mail days</Label>
            <Input type="number" value={form.mailing_days} onChange={(e) => setForm({ ...form, mailing_days: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-6">
            <Button size="sm" onClick={addRule} disabled={saving}>
              <Plus className="h-3 w-3 mr-1" />Add rule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
