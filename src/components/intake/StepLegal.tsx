import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./types";

const QUESTIONS: { key: string; label: string; help?: string }[] = [
  { key: "lq_current_occupant", label: "Is the tenant currently occupying the unit?" },
  { key: "lq_tenant_moved", label: "Has the tenant moved out?" },
  { key: "lq_known_bankruptcy", label: "Is there a known bankruptcy filing?", help: "Triggers an automatic stay." },
  { key: "lq_military_verified", label: "Has military (SCRA) status been verified?" },
  { key: "lq_attorney_retained", label: "Has the tenant retained an attorney?" },
  { key: "lq_judgment_exists", label: "Does a prior judgment already exist?" },
  { key: "lq_collection_agency_involved", label: "Is a collection agency already involved?" },
];

export default function StepLegal({ matter, save, next, back }: StepProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!matter) return;
    const initial: Record<string, boolean> = {};
    QUESTIONS.forEach((q) => { initial[q.key] = !!matter[q.key]; });
    setAnswers(initial);
    setNotes(matter.lq_notes ?? "");
  }, [matter?.id]);

  const handleNext = async () => {
    setSaving(true);
    await save({ ...answers, lq_notes: notes || null, military_verified: !!answers.lq_military_verified });
    setSaving(false);
    next();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 9 — Legal Questions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <Label className="text-sm">{q.label}</Label>
                {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
              </div>
              <Switch
                checked={!!answers[q.key]}
                onCheckedChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Additional legal notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={handleNext} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
