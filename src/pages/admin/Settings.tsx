import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface TemplateItem {
  id: string;
  milestone_key: string;
  label: string;
  order_index: number;
  auto_offset_days: number | null;
  default_client_visible: boolean;
  required_document_category: string | null;
}

interface Template {
  id: string;
  template_name: string;
  jurisdiction_state: string;
  jurisdiction_county: string;
  case_type: string;
  is_default: boolean;
  is_active: boolean;
  items: TemplateItem[];
}

const DOC_CATEGORIES = [
  "lease", "rent_ledger", "notice", "proof_of_service", "petition_filing",
  "court_document", "photo", "correspondence", "other",
];

export default function AdminSettings() {
  const { toast } = useToast();
  const [disclaimer, setDisclaimer] = useState("");
  const [noticeDays, setNoticeDays] = useState("14");
  const [reminderOffsets, setReminderOffsets] = useState("3,1");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [settingsRes, templatesRes, itemsRes] = await Promise.all([
      supabase.from("system_settings").select("*"),
      supabase.from("milestone_templates").select("*").order("template_name"),
      supabase.from("milestone_template_items").select("*").order("order_index"),
    ]);

    const map: Record<string, any> = {};
    settingsRes.data?.forEach((s: any) => { map[s.setting_key] = s.setting_value_json; });
    setDisclaimer(typeof map.legal_disclaimer === "string" ? map.legal_disclaimer : JSON.stringify(map.legal_disclaimer || ""));
    const defaults = map.jurisdiction_defaults || {};
    setNoticeDays(String(defaults.default_notice_days || 14));
    setReminderOffsets((defaults.reminder_offsets || [3, 1]).join(","));

    const items = itemsRes.data || [];
    const tpls = (templatesRes.data || []).map((t: any) => ({
      ...t,
      items: items.filter((i: any) => i.template_id === t.id),
    }));
    setTemplates(tpls);
    if (tpls.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(tpls[0].id);
      setEditItems(tpls[0].items);
    }
    setLoading(false);
  };

  const saveDisclaimer = async () => {
    await supabase.from("system_settings").update({ setting_value_json: disclaimer }).eq("setting_key", "legal_disclaimer");
    toast({ title: "Disclaimer saved" });
  };

  const saveDefaults = async () => {
    const offsets = reminderOffsets.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const updated = { default_notice_days: parseInt(noticeDays), reminder_offsets: offsets };
    await supabase.from("system_settings").update({ setting_value_json: updated }).eq("setting_key", "jurisdiction_defaults");
    toast({ title: "Defaults saved" });
  };

  const selectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    setEditItems(tpl?.items || []);
  };

  const updateItem = (idx: number, field: keyof TemplateItem, value: any) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    const maxOrder = editItems.length > 0 ? Math.max(...editItems.map(i => i.order_index)) : 0;
    setEditItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      milestone_key: `milestone_${Date.now()}`,
      label: "",
      order_index: maxOrder + 1,
      auto_offset_days: null,
      default_client_visible: true,
      required_document_category: null,
    }]);
  };

  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const saveTemplateItems = async () => {
    if (!selectedTemplateId) return;

    // Delete existing items for this template
    await supabase.from("milestone_template_items").delete().eq("template_id", selectedTemplateId);

    // Insert updated items
    const rows = editItems.map((item, idx) => ({
      template_id: selectedTemplateId,
      milestone_key: item.milestone_key || `milestone_${idx}`,
      label: item.label,
      order_index: idx + 1,
      auto_offset_days: item.auto_offset_days,
      default_client_visible: item.default_client_visible,
      required_document_category: item.required_document_category as any,
    }));

    if (rows.length > 0) {
      await supabase.from("milestone_template_items").insert(rows);
    }

    toast({ title: "Template milestones saved" });
    await loadAll();
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6 max-w-4xl">
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

      <Tabs defaultValue="defaults" className="space-y-4">
        <TabsList>
          <TabsTrigger value="defaults">Jurisdiction Defaults</TabsTrigger>
          <TabsTrigger value="templates">Milestone Templates</TabsTrigger>
          <TabsTrigger value="disclaimer">Legal Disclaimer</TabsTrigger>
        </TabsList>

        <TabsContent value="defaults">
          <Card>
            <CardHeader><CardTitle className="text-sm">Erie County / NY Defaults</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Default Notice Days</Label>
                  <Input type="number" value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} className="w-32" />
                  <p className="text-xs text-muted-foreground">Standard rent demand notice period</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Reminder Offsets (days before due)</Label>
                  <Input value={reminderOffsets} onChange={(e) => setReminderOffsets(e.target.value)} className="w-48" placeholder="3,1" />
                  <p className="text-xs text-muted-foreground">Comma-separated, e.g. 3,1</p>
                </div>
              </div>
              <Button size="sm" onClick={saveDefaults}><Save className="h-4 w-4 mr-1" />Save Defaults</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Milestone Templates</CardTitle>
                {templates.length > 0 && (
                  <Select value={selectedTemplateId || ""} onValueChange={selectTemplate}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.template_name} {t.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{selectedTemplate.jurisdiction_state} / {selectedTemplate.jurisdiction_county}</Badge>
                  <Badge variant="outline">{selectedTemplate.case_type}</Badge>
                  {selectedTemplate.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
              )}

              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : editItems.length === 0 && !selectedTemplateId ? (
                <p className="text-muted-foreground text-sm">No templates found. Create one to get started.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead className="w-24">Key</TableHead>
                        <TableHead className="w-20">Offset</TableHead>
                        <TableHead className="w-36 hidden md:table-cell">Doc Category</TableHead>
                        <TableHead className="w-16">Visible</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editItems.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={item.label}
                              onChange={(e) => updateItem(idx, "label", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Milestone label"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.milestone_key}
                              onChange={(e) => updateItem(idx, "milestone_key", e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder="key"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.auto_offset_days ?? ""}
                              onChange={(e) => updateItem(idx, "auto_offset_days", e.target.value ? parseInt(e.target.value) : null)}
                              className="h-8 text-sm w-16"
                              placeholder="days"
                            />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Select
                              value={item.required_document_category || "none"}
                              onValueChange={(v) => updateItem(idx, "required_document_category", v === "none" ? null : v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {DOC_CATEGORIES.map(c => (
                                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={item.default_client_visible}
                              onCheckedChange={(v) => updateItem(idx, "default_client_visible", !!v)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Milestone
                    </Button>
                    <Button size="sm" onClick={saveTemplateItems}>
                      <Save className="h-4 w-4 mr-1" />Save Template
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disclaimer">
          <Card>
            <CardHeader><CardTitle className="text-sm">Legal Disclaimer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} rows={4} />
              <p className="text-xs text-muted-foreground">This text is displayed to users in relevant areas of the application.</p>
              <Button size="sm" onClick={saveDisclaimer}><Save className="h-4 w-4 mr-1" />Save Disclaimer</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
