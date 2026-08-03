import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_matter_events",
  title: "List matter events",
  description: "Return the chronological timeline/events for a single matter.",
  inputSchema: {
    case_id: z.string().uuid().describe("The case/matter UUID."),
    limit: z.number().int().min(1).max(50).optional().describe("Max events to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ case_id, limit = 20 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("matter_events")
      .select("id, event_type, event_at, description, metadata, created_by, created_at")
      .eq("case_id", case_id)
      .order("event_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} event(s).` }],
      structuredContent: { events: data ?? [] },
    };
  },
});
