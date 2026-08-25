import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tabelle coperte dai trigger di audit (vedi migration add_audit_log_triggers).
// Elenco duplicato qui volutamente: la function valida in modo indipendente,
// anche se il chiamante ha già superato il controllo ruolo admin.
const RESTORABLE_TABLES = new Set([
  "clients", "cats", "cat_registry",
  "bookings", "booking_cats", "appointments", "cage_overrides",
  "quote_requests", "documents", "planning_tasks",
  "payments", "payment_methods", "payment_split_configs", "price_lists",
  "cancellation_policies", "cancellation_policy_rules", "slot_configs",
  "profiles", "user_roles", "tenants", "tenant_stripe_keys", "system_config",
]);

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

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audit_log_id } = await req.json();
    if (!audit_log_id) {
      return new Response(JSON.stringify({ error: "Missing audit_log_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: entry, error: entryError } = await adminClient
      .from("audit_log")
      .select("*")
      .eq("id", audit_log_id)
      .single();
    if (entryError || !entry) {
      return new Response(JSON.stringify({ error: "Voce di audit non trovata" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!entry.after_data) {
      return new Response(JSON.stringify({ error: "Questa voce non ha uno stato da ripristinare (era un'eliminazione)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESTORABLE_TABLES.has(entry.table_name)) {
      return new Response(JSON.stringify({ error: `Tabella "${entry.table_name}" non ripristinabile` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapshot = entry.after_data as Record<string, unknown>;

    const { data: existing } = await adminClient
      .from(entry.table_name)
      .select("id")
      .eq("id", entry.record_id)
      .maybeSingle();

    const { error: writeError } = existing
      ? await adminClient.from(entry.table_name).update(snapshot).eq("id", entry.record_id)
      : await adminClient.from(entry.table_name).insert(snapshot);

    if (writeError) {
      return new Response(JSON.stringify({ error: writeError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // La scrittura sopra ha gia' generato in automatico una riga in audit_log
    // (tramite il trigger fn_audit_row, come operation INSERT/UPDATE). La
    // ritaggiamo come RESTORE e associamo l'utente reale che ha ripristinato
    // (la scrittura e' stata fatta con la service role key, quindi auth.uid()
    // nel trigger risulta null).
    const { data: latest } = await adminClient
      .from("audit_log")
      .select("id")
      .eq("table_name", entry.table_name)
      .eq("record_id", entry.record_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      await adminClient
        .from("audit_log")
        .update({ operation: "RESTORE", user_id: user.id, user_role: "admin" })
        .eq("id", latest.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
