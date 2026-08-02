import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import { NOTE_VISIBILITY_LABELS, visibleNoteFilter, type NoteViewer } from "@/lib/notes";
import { logMatterEvent } from "@/lib/matter";

interface Props {
  caseId: string;
  viewer: Extract<NoteViewer, "admin" | "attorney">;
  attorneyId?: string | null;
}

/**
 * Attorney-privileged notes. RLS is the authority; this component additionally
 * filters client-side and never renders privileged text to an unauthorized viewer.
 */
export default function PrivilegedNotesPanel({ caseId, viewer, attorneyId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("case_notes")
      .select("*")
      .eq("case_id", caseId)
      .eq("visibility", "attorney_privileged")
      .order("created_at", { ascending: false });
    setNotes(
      visibleNoteFilter((data ?? []) as any[], {
        viewer,
        userId: user?.id,
        attorneyId,
        isAssigned: true,
      }),
    );
  }, [caseId, viewer, user?.id, attorneyId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("case_notes").insert({
      case_id: caseId,
      note_type: "internal",
      visibility: "attorney_privileged",
      content: text.trim(),
      created_by: user?.id,
      author_counsel_id: attorneyId ?? null,
    });
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
    } else {
      // The timeline records that a privileged note exists — never its text.
      await logMatterEvent({
        caseId,
        eventKey: "attorney_privileged_note_created",
        label: "Privileged attorney note added",
        isInternal: true,
        metadata: { visibility: "attorney_privileged" },
      });
      setText("");
      await load();
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />Privileged notes
          <Badge variant="outline" className="text-[10px]">{NOTE_VISIBILITY_LABELS.attorney_privileged}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Visible only to assigned attorneys and authorized administrators. Never shown to clients, agencies,
          exports or packets.
        </p>
        <Textarea rows={3} placeholder="Privileged note…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" onClick={add} disabled={busy || !text.trim()}>Add privileged note</Button>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-xs">No privileged notes</p>
          ) : notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground mb-1">{new Date(n.created_at).toLocaleString()}</div>
              {n.content}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}