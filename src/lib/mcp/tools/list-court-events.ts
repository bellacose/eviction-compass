import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_court_events",
  title: "List court events",
  description: "Return upcoming court events for the signed-in user's scope.",
  inputSchema: {
    case_id: z.string().uuid().optional().describe("Optional case/matter UUID to restrict events."),
    from: z.string().datetime().optional().describe("Optional ISO start date (default now)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max events to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ case_id, from, limit = 20 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("court_events")
      .select("id, case_id, event_type, start_at, end_at, court_name, location, virtual_link, outcome, next_event_at, notes")
      .order("start_at", { ascending: true })
      .limit(limit);
    if (case_id) query = query.eq("case_id", case_id);
    if (from) query = query.gte("start_at", from);
    else query = query.gte("start_at", new Date().toISOString());
    const { data, error } = await query;
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} court event(s).` }],
      structuredContent: { court_events: data ?? [] },
    };
  },
});
