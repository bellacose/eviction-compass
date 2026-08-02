import type { Database } from "@/integrations/supabase/types";

export type NoteVisibility = Database["public"]["Enums"]["note_visibility"];

export type NoteViewer = "admin" | "attorney" | "client" | "agency";

export const NOTE_VISIBILITIES: { value: NoteVisibility; label: string; hint: string }[] = [
  { value: "admin_internal", label: "Internal", hint: "Staff only — never shown to the client" },
  { value: "client_visible", label: "Client update", hint: "Visible in the client portal" },
  { value: "attorney_privileged", label: "Attorney privileged", hint: "Assigned attorneys and authorized admins only" },
  { value: "agency_visible", label: "Agency visible", hint: "Shared with the collection agency" },
  { value: "system_generated", label: "System", hint: "Written by the system" },
];

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibility, string> = Object.fromEntries(
  NOTE_VISIBILITIES.map((v) => [v.value, v.label]),
) as Record<NoteVisibility, string>;

export function isPrivileged(visibility: NoteVisibility | null | undefined): boolean {
  return visibility === "attorney_privileged";
}

/**
 * Which visibilities a viewer may ever read. Mirrors the case_notes RLS policies;
 * the database stays the authority, this keeps queries, exports and packets aligned.
 */
export function allowedVisibilities(viewer: NoteViewer): NoteVisibility[] {
  switch (viewer) {
    case "admin":
      return ["admin_internal", "client_visible", "attorney_privileged", "agency_visible", "system_generated"];
    case "attorney":
      return ["admin_internal", "client_visible", "attorney_privileged", "system_generated"];
    case "client":
      return ["client_visible", "system_generated"];
    case "agency":
      return ["agency_visible", "system_generated"];
  }
}

export interface ReadableNote {
  visibility: NoteVisibility;
  created_by?: string | null;
  author_counsel_id?: string | null;
}

export interface NoteAccessContext {
  viewer: NoteViewer;
  /** auth user id of the reader */
  userId?: string | null;
  /** counsel.id of the reader when they are an attorney principal */
  attorneyId?: string | null;
  /** whether the reader is actively assigned to the matter */
  isAssigned?: boolean;
}

export function canReadNote(note: ReadableNote, ctx: NoteAccessContext): boolean {
  if (!allowedVisibilities(ctx.viewer).includes(note.visibility)) return false;
  if (note.visibility === "attorney_privileged") {
    if (ctx.viewer === "admin") return true;
    if (ctx.viewer !== "attorney") return false;
    if (!ctx.attorneyId || !ctx.isAssigned) return false;
  }
  return true;
}

/** Filter used by every portal query, export and packet builder. */
export function visibleNoteFilter<T extends ReadableNote>(notes: T[], ctx: NoteAccessContext): T[] {
  return notes.filter((n) => canReadNote(n, ctx));
}

/** Privileged text must never reach an export, packet, feed or notification body. */
export function redactForExport<T extends ReadableNote & { content?: string }>(notes: T[]): T[] {
  return notes.filter((n) => n.visibility !== "attorney_privileged");
}