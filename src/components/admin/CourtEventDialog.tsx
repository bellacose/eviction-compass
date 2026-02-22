import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EVENT_TYPES = ["hearing", "adjournment", "judgment", "warrant", "other"] as const;

interface CourtEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  initialData?: any;
  saving?: boolean;
}

export default function CourtEventDialog({ open, onOpenChange, onSave, initialData, saving }: CourtEventDialogProps) {
  const [form, setForm] = useState({
    event_type: "hearing",
    court_name: "",
    start_at: "",
    end_at: "",
    location: "",
    virtual_link: "",
    outcome: "",
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        event_type: initialData.event_type || "hearing",
        court_name: initialData.court_name || "",
        start_at: initialData.start_at ? initialData.start_at.slice(0, 16) : "",
        end_at: initialData.end_at ? initialData.end_at.slice(0, 16) : "",
        location: initialData.location || "",
        virtual_link: initialData.virtual_link || "",
        outcome: initialData.outcome || "",
        notes: initialData.notes || "",
      });
    } else {
      setForm({ event_type: "hearing", court_name: "", start_at: "", end_at: "", location: "", virtual_link: "", outcome: "", notes: "" });
    }
  }, [initialData, open]);

  const handleSave = () => {
    onSave({
      event_type: form.event_type,
      court_name: form.court_name || null,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      location: form.location || null,
      virtual_link: form.virtual_link || null,
      outcome: form.outcome || null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Court Event" : "Add Court Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Event Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Court Name</Label>
            <Input className="h-9 text-sm" value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Date/Time</Label>
              <Input type="datetime-local" className="h-9 text-sm" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">End Date/Time</Label>
              <Input type="datetime-local" className="h-9 text-sm" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input className="h-9 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Virtual Link</Label>
            <Input className="h-9 text-sm" value={form.virtual_link} onChange={(e) => setForm({ ...form, virtual_link: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Outcome</Label>
            <Input className="h-9 text-sm" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
