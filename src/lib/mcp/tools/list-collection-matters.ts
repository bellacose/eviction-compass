import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_collection_matters",
  title: "List collection matters",
  description: "Return collection/debt matters visible to the signed-in user.",
  inputSchema: {
    status: z.enum(["open", "in_house", "placed_with_agency", "judgment_sold", "in_enforcement", "settled", "written_off", "paid"]).optional().describe("Filter by collection status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default 20)."),
    offset: z.number().int().min(0).optional().describe("Offset for pagination (default 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit = 20, offset = 0 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("collection_matters")
      .select("id, case_id, status, origin, total_owed, total_paid, balance_due, created_at, clients(id, company_name), cases(case_number)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} collection matter(s).` }],
      structuredContent: { collection_matters: data ?? [] },
    };
  },
});
