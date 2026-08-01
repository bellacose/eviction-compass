import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, Upload } from "lucide-react";
import { INTAKE_DOC_CATEGORIES } from "@/lib/matter";
import type { StepProps } from "./types";

export default function StepDocuments({ matter, clientId, next, back }: StepProps) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [category, setCategory] = useState("lease");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const caseId = matter?.id as string | undefined;

  const load = useCallback(async () => {
    if (!caseId) return;
    const { data } = await supabase.from("documents").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!file || !caseId) return;
    setUploading(true);
    const filePath = `client/${clientId}/case/${caseId}/${category}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("case-documents").upload(filePath, file);
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("documents").insert({
      case_id: caseId,
      file_name: file.name,
      file_path: filePath,
      mime_type: file.type,
      file_size: file.size,
      category: category as never,
      description: description || null,
      visible_to_client: true,
      uploaded_by: auth.user?.id ?? null,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Could not record document", description: error.message, variant: "destructive" });
      return;
    }
    setFile(null);
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
    toast({ title: "Document uploaded" });
    load();
  };

  const download = async (doc: any) => {
    const { data, error } = await supabase.storage.from("case-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (doc: any) => {
    await supabase.storage.from("case-documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    toast({ title: "Document removed" });
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Step 8 — Documents</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTAKE_DOC_CATEGORIES.map((c) => <SelectItem key={c.label} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input ref={inputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button type="button" onClick={upload} disabled={!file || uploading}>
          <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload"}
        </Button>

        <div className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">{d.description || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.category}</Badge>
                <Button variant="ghost" size="icon" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={back}>Back</Button>
          <Button onClick={next}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
