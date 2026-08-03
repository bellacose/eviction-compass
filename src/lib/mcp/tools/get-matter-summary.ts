import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_matter_summary",
  title: "Get matter summary",
  description: "Return a single matter's header, status, matter type, and current balance.",
  inputSchema: {
    case_id: z.string().uuid().describe("The case/matter UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ case_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Not authenticated", { isError: true });
    }
    const supabase = supabaseForUser(ctx);
    const { data: matter, error: matterError } = await supabase
      .from("cases")
      .select(
        "id, case_number, status, matter_type, opened_date, closed_date, priority, sub_status, is_on_hold, hold_reason, court_name, court_case_number, court_address, clients(id, company_name), properties(address_line1, city, state, zip), tenants(full_name)"
      )
      .eq("id", case_id)
      .single();
    if (matterError) {
      throw new ToolError(matterError.message, { isError: true });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("case_tenants")
      .select("tenants(full_name)")
      .eq("case_id", case_id)
      .eq("is_primary", true)
      .single();
    if (tenantError && tenantError.code !== "PGRST116") {
      // ignore no-primary-tenant case
    }

    const { data: balance, error: balanceError } = await supabase
      .rpc("ledger_balance_as_of", { p_case_id: case_id, p_as_of: new Date().toISOString() });
    if (balanceError) {
      // balance is optional; don't fail the whole call
    }

    return {
      content: [
        {
          type: "text",
          text: `Matter ${matter.case_number} is ${matter.status}.`,
        },
      ],
      structuredContent: {
        matter,
        primary_tenant: tenant?.tenants ?? null,
        balance_due: balance ?? null,
      },
    };
  },
});
