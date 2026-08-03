import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_matter_documents",
  title: "List matter documents",
  description: "List documents for a matter. For admin users all documents are returned; for client users only client-visible documents are returned.",
  inputSchema: {
    case_id: z.string().uuid().describe("The case/matter UUID."),
    category: z.enum(["lease", "rent_ledger", "notice", "proof_of_service", "petition_filing", "court_document", "photo", "correspondence", "other"]).optional().describe("Filter by document category."),
    limit: z.number().int().min(1).max(50).optional().describe("Max documents to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ case_id, category, limit = 20 }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("documents")
      .select("id, file_name, category, mime_type, file_size, visible_to_client, description, created_at, uploaded_by")
      .eq("case_id", case_id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) {
      throw new ToolError(error.message, { isError: true });
    }
    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} document(s).` }],
      structuredContent: { documents: data ?? [] },
    };
  },
});
