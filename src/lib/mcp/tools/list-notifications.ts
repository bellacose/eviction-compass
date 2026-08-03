import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_notifications",
  title: "List notifications",
  description: "Return unread in-app notifications for the signed-in user.",
  inputSchema: {
    status: z.enum(["queued", "sent", "failed", "read"]).optional().describe("Filter by notification status (default sent)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max notifications to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit = 20 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("notifications")
      .select("id, case_id, title, message, channel, status, read_at, created_at")
      .eq("recipient_user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    else query = query.eq("status", "sent");
    const { data, error } = await query;
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} notification(s).` }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
