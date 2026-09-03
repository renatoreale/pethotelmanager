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
      .select("id, user_id, trial_start, trial_end, is_converted, last_login_at");

    const trialMap: Record<string, { trial_id: string; trial_start: string; trial_end: string; is_converted: boolean; last_login_at: string | null }> = {};
    for (const t of trialRows || []) {
      trialMap[t.user_id] = {
        trial_id: t.id,
        trial_start: t.trial_start,
        trial_end: t.trial_end,
        is_converted: t.is_converted,
        last_login_at: t.last_login_at,
      };
    }

    // Count bookings/preventivi actually created by each trial user (real product usage,
    // not just "logged in" — trial users share one demo tenant so tenant-level counts
    // would mix everyone's data; created_by is per-user and safe to use here).
    const trialUserIds = (trialRows || []).map((t) => t.user_id);
    const bookingsCreatedMap: Record<string, number> = {};
    if (trialUserIds.length > 0) {
      const { data: bookingRows } = await adminClient
        .from("bookings")
        .select("created_by")
        .in("created_by", trialUserIds);
      for (const b of bookingRows || []) {
        if (b.created_by) {
          bookingsCreatedMap[b.created_by] = (bookingsCreatedMap[b.created_by] || 0) + 1;
        }
      }
    }

    // Fase 5: ultima attività registrata per ogni trial (registrazione, email,
    // password, login, azioni prodotto) — così il pannello admin la mostra
    // in tabella senza dover aprire la timeline dettagliata di ognuno.
    const trialIds = (trialRows || []).map((t) => t.id);
    const lastActivityByTrialId: Record<string, { action: string; created_at: string }> = {};
    if (trialIds.length > 0) {
      const { data: activityRows } = await adminClient
        .from("trial_activity_log")
        .select("trial_id, action, created_at")
        .in("trial_id", trialIds)
        .order("created_at", { ascending: false });
      for (const a of activityRows || []) {
        // Il primo incontrato per trial_id è il più recente (ordinato desc).
        if (!lastActivityByTrialId[a.trial_id]) {
          lastActivityByTrialId[a.trial_id] = { action: a.action, created_at: a.created_at };
        }
      }
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
      trial_id: string | null;
      trial_start: string | null;
      trial_end: string | null;
      is_converted: boolean;
      bookings_created: number;
      last_activity: { action: string; created_at: string } | null;
    }> = {};

    for (const u of allUsers) {
      emails[u.id] = u.email || "";
      const trial = trialMap[u.id];

      // L'attività più recente è la più tardiva tra l'ultimo evento tracciato
      // e l'ultimo login (aggiornato ad ogni accesso, non solo al primo).
      let lastActivity: { action: string; created_at: string } | null = null;
      if (trial?.trial_id) {
        const loggedActivity = lastActivityByTrialId[trial.trial_id] || null;
        const loginActivity = trial.last_login_at ? { action: "login", created_at: trial.last_login_at } : null;
        if (loggedActivity && loginActivity) {
          lastActivity = loggedActivity.created_at >= loginActivity.created_at ? loggedActivity : loginActivity;
        } else {
          lastActivity = loggedActivity || loginActivity;
        }
      }

      userDetails[u.id] = {
        email: u.email || "",
        created_at: u.created_at,
        confirmed_at: u.email_confirmed_at || null,
        banned_until: u.banned_until || null,
        last_sign_in_at: u.last_sign_in_at || null,
        user_metadata: u.user_metadata || {},
        trial_id: trial?.trial_id || null,
        trial_start: trial?.trial_start || null,
        trial_end: trial?.trial_end || null,
        is_converted: trial?.is_converted || false,
        bookings_created: bookingsCreatedMap[u.id] || 0,
        last_activity: lastActivity,
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
