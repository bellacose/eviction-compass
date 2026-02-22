import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SERVICE_METHODS = ["personal", "substituted", "conspicuous_nail_mail", "certified_mail", "other"] as const;
const METHOD_LABELS: Record<string, string> = {
  personal: "Personal",
  substituted: "Substituted",
  conspicuous_nail_mail: "Conspicuous (Nail & Mail)",
  certified_mail: "Certified Mail",
  other: "Other",
};

interface ServiceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  initialData?: any;
  saving?: boolean;
}

export default function ServiceRecordDialog({ open, onOpenChange, onSave, initialData, saving }: ServiceRecordDialogProps) {
  const [form, setForm] = useState({
    notice_type: "14-day demand",
    service_method: "personal" as string,
    service_date: "",
    service_time: "",
    served_by: "",
    mailing_tracking_number: "",
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        notice_type: initialData.notice_type || "14-day demand",
        service_method: initialData.service_method || "personal",
        service_date: initialData.service_date || "",
        service_time: initialData.service_time || "",
        served_by: initialData.served_by || "",
        mailing_tracking_number: initialData.mailing_tracking_number || "",
        notes: initialData.notes || "",
      });
    } else {
      setForm({ notice_type: "14-day demand", service_method: "personal", service_date: "", service_time: "", served_by: "", mailing_tracking_number: "", notes: "" });
    }
  }, [initialData, open]);

  const handleSave = () => {
    onSave({
      notice_type: form.notice_type || null,
      service_method: form.service_method || null,
      service_date: form.service_date || null,
      service_time: form.service_time || null,
      served_by: form.served_by || null,
      mailing_tracking_number: form.mailing_tracking_number || null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Service Record" : "Add Service Record"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Notice Type</Label>
            <Input className="h-9 text-sm" value={form.notice_type} onChange={(e) => setForm({ ...form, notice_type: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Service Method</Label>
            <Select value={form.service_method} onValueChange={(v) => setForm({ ...form, service_method: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Service Date</Label>
              <Input type="date" className="h-9 text-sm" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Service Time</Label>
              <Input type="time" className="h-9 text-sm" value={form.service_time} onChange={(e) => setForm({ ...form, service_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Served By</Label>
            <Input className="h-9 text-sm" value={form.served_by} onChange={(e) => setForm({ ...form, served_by: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Mailing Tracking Number</Label>
            <Input className="h-9 text-sm" value={form.mailing_tracking_number} onChange={(e) => setForm({ ...form, mailing_tracking_number: e.target.value })} />
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
