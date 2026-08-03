import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_client_update",
  title: "Log client update",
  description: "Post a client-visible update note on a matter and notify the client. Admin-only.",
  inputSchema: {
    case_id: z.string().uuid().describe("The case/matter UUID."),
    content: z.string().min(1).max(2000).describe("The client-facing update message."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ case_id, content }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    // Check caller is an admin (RLS will also enforce this, but fail fast with a clear message).
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", ctx.getUserId())
      .single();
    if (profileError || !profile) {
      throw new ToolError("Unable to verify caller profile", { isError: true });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.getUserId());
    const isAdmin = (roles ?? []).some((r) => r.role === "super_admin" || r.role === "admin");
    if (!isAdmin) {
      throw new ToolError("Only admin users can log client updates", { isError: true });
    }

    const { data: note, error: noteError } = await supabase
      .from("case_notes")
      .insert({
        case_id,
        note_type: "client_update",
        content,
        created_by: ctx.getUserId(),
      })
      .select("id, content, created_at")
      .single();
    if (noteError) {
      throw new ToolError(noteError.message, { isError: true });
    }

    return {
      content: [{ type: "text", text: "Client update logged." }],
      structuredContent: { note },
    };
  },
});
