import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_collection_balance",
  title: "Get collection balance",
  description: "Return the current balance and recent activity for a collection matter.",
  inputSchema: {
    collection_matter_id: z.string().uuid().describe("The collection matter UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ collection_matter_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    const { data: matter, error: matterError } = await supabase
      .from("collection_matters")
      .select("id, case_id, status, origin, total_owed, total_paid, balance_due, created_at, cases(case_number)")
      .eq("id", collection_matter_id)
      .single();
    if (matterError) {
      throw new ToolError(matterError.message, { isError: true });
    }
    const { data: activities, error: activitiesError } = await supabase
      .from("collection_activities")
      .select("id, activity_type, amount, activity_date, description, created_at")
      .eq("collection_matter_id", collection_matter_id)
      .order("activity_date", { ascending: false })
      .limit(20);
    if (activitiesError) {
      // non-fatal
    }
    return {
      content: [{ type: "text", text: `Collection matter balance is ${matter.balance_due}.` }],
      structuredContent: {
        collection_matter: matter,
        recent_activities: activities ?? [],
      },
    };
  },
});
