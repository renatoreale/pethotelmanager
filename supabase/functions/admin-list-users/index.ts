import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPermission = roles?.some(
      (r) => r.role === "admin" || r.role === "titolare"
    );
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // List all auth users with full details
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users: authUsers }, error: listError } =
        await adminClient.auth.admin.listUsers({ page, perPage });
      if (listError) throw listError;
      if (!authUsers || authUsers.length === 0) break;
      allUsers.push(...authUsers);
      if (authUsers.length < perPage) break;
      page++;
    }

    // Fetch trial_registrations with service role (bypasses RLS)
    const { data: trialRows } = await adminClient
      .from("trial_registrations")
      .select("user_id, trial_start, trial_end, is_converted");

    const trialMap: Record<string, { trial_start: string; trial_end: string; is_converted: boolean }> = {};
    for (const t of trialRows || []) {
      trialMap[t.user_id] = {
        trial_start: t.trial_start,
        trial_end: t.trial_end,
        is_converted: t.is_converted,
      };
    }

    // Return detailed user info
    const emails: Record<string, string> = {};
    const userDetails: Record<string, {
      email: string;
      created_at: string;
      confirmed_at: string | null;
      banned_until: string | null;
      last_sign_in_at: string | null;
      user_metadata: Record<string, any>;
      trial_start: string | null;
      trial_end: string | null;
      is_converted: boolean;
    }> = {};

    for (const u of allUsers) {
      emails[u.id] = u.email || "";
      const trial = trialMap[u.id];
      userDetails[u.id] = {
        email: u.email || "",
        created_at: u.created_at,
        confirmed_at: u.email_confirmed_at || null,
        banned_until: u.banned_until || null,
        last_sign_in_at: u.last_sign_in_at || null,
        user_metadata: u.user_metadata || {},
        trial_start: trial?.trial_start || null,
        trial_end: trial?.trial_end || null,
        is_converted: trial?.is_converted || false,
      };
    }

    return new Response(JSON.stringify({ emails, userDetails, trialMap }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
