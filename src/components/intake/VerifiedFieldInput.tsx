import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { VerifiedField } from "@/lib/matter";

interface Props {
  label: string;
  field: VerifiedField;
  onChange: (next: VerifiedField) => void;
  type?: string;
  placeholder?: string;
}

/** A single rental-application field carrying its own source / verified / verification date. */
export default function VerifiedFieldInput({ label, field, onChange, type = "text", placeholder }: Props) {
  const set = (patch: Partial<VerifiedField>) => onChange({ ...field, ...patch });

  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={field.value}
        placeholder={placeholder}
        onChange={(e) => set({ value: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          className="h-8 text-xs"
          placeholder="Source"
          value={field.source ?? ""}
          onChange={(e) => set({ source: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          type="date"
          value={field.verification_date ?? ""}
          onChange={(e) => set({ verification_date: e.target.value || null })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={!!field.verified}
          onCheckedChange={(c) => set({ verified: c === true })}
        />
        Verified
      </label>
    </div>
  );
}
