import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: callerId });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { counsel_id } = await req.json();
    if (!counsel_id) return json({ error: "counsel_id is required" }, 400);

    const { data: counsel, error: counselError } = await adminClient
      .from("counsel")
      .select("id, attorney_name, email, user_id, status")
      .eq("id", counsel_id)
      .single();

    if (counselError || !counsel) return json({ error: "Counsel record not found" }, 404);
    if (!counsel.email) return json({ error: "This counsel record has no email address" }, 400);
    if (counsel.user_id) return json({ error: "This attorney already has portal access" }, 409);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(counsel.email)) return json({ error: "Invalid email format" }, 400);

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(counsel.email, {
        data: { full_name: counsel.attorney_name },
      });
    if (inviteError) return json({ error: inviteError.message }, 400);

    const userId = inviteData.user.id;

    await adminClient
      .from("profiles")
      .update({ full_name: counsel.attorney_name, email: counsel.email })
      .eq("id", userId);

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: "attorney" });
    if (roleError && !roleError.message.includes("duplicate")) {
      return json({ error: roleError.message }, 400);
    }

    const { error: linkError } = await adminClient
      .from("counsel")
      .update({ user_id: userId, status: "invited", invited_at: new Date().toISOString() })
      .eq("id", counsel_id);
    if (linkError) return json({ error: linkError.message }, 400);

    return json({ success: true, user_id: userId });
  } catch (err) {
    return json({ error: (err as Error).message || "Internal server error" }, 500);
  }
});