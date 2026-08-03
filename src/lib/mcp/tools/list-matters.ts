import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_matters",
  title: "List matters",
  description: "List eviction and collection matters visible to the signed-in user.",
  inputSchema: {
    status: z.enum(["intake", "notice_preparation", "notice_served", "waiting_period", "ready_to_file", "filed", "court_scheduled", "in_court_process", "outcome_pending", "resolved", "closed", "on_hold", "draft", "attorney_review"]).optional().describe("Filter by case status."),
    matter_type: z.enum(["non_payment", "holdover", "lease_violation", "former_tenant_collection", "judgment_collection", "other"]).optional().describe("Filter by matter type."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default 20)."),
    offset: z.number().int().min(0).optional().describe("Offset for pagination (default 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, matter_type, limit = 20, offset = 0 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("cases")
      .select("id, case_number, status, matter_type, opened_date, closed_date, priority, sub_status, clients(id, company_name)")
      .order("opened_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (matter_type) query = query.eq("matter_type", matter_type);

    const { data, error } = await query;
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [
        {
          type: "text",
          text: `Found ${data?.length ?? 0} matter(s).`,
        },
      ],
      structuredContent: { matters: data ?? [] },
    };
  },
});
