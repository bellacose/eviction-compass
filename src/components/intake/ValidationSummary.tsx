import { AlertCircle } from "lucide-react";
import { fieldLabel, type FieldErrors } from "@/lib/intake-validation";

interface Props {
  errors: FieldErrors;
  /** Optional extra blocking messages that are not tied to a single field. */
  extra?: (string | null | undefined)[];
  title?: string;
}

/** Step-level recap of everything blocking the user, with human-readable field names. */
export default function ValidationSummary({ errors, extra = [], title }: Props) {
  const fieldIssues = Object.entries(errors);
  const extras = extra.filter(Boolean) as string[];
  const count = fieldIssues.length + extras.length;
  if (count === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {title ?? `${count} issue${count === 1 ? "" : "s"} to fix before continuing`}
      </div>
      <ul className="mt-2 space-y-1 pl-6 text-sm text-destructive list-disc">
        {fieldIssues.map(([name, message]) => (
          <li key={name}>
            <span className="font-medium">{fieldLabel(name)}</span> — {message}
          </li>
        ))}
        {extras.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

/** Inline, per-field error message. */
export function FieldError({ errors, name }: { errors: FieldErrors; name: string }) {
  if (!errors[name]) return null;
  return (
    <p id={`err-${name}`} className="text-xs text-destructive">
      {errors[name]}
    </p>
  );
}