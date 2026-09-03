import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_EVENTS = [
  "password_set",
  "login",
  "preventivo_creato",
  "prenotazione_confermata",
  "check_in_effettuato",
  "check_out_effettuato",
] as const;
type AllowedEvent = typeof ALLOWED_EVENTS[number];

// Eventi che riflettono un uso reale del prodotto: si registrano ogni volta
// (non solo la prima), cosi' l'admin vede anche l'attivita' piu' recente,
// non solo la primissima. password_set/first_login restano invece
// deduplicati: sono traguardi "una tantum" del funnel di onboarding.
const PRODUCT_ACTION_EVENTS = [
  "preventivo_creato",
  "prenotazione_confermata",
  "check_in_effettuato",
  "check_out_effettuato",
] as const;

// Fase 5: chiamata dal frontend (utente autenticato) per tracciare i
// passaggi del funnel trial dopo la registrazione — quando imposta la
// password e al primo accesso — così l'admin vede dove un utente si blocca.
// Richiede un utente autenticato (verify_jwt di default): nessun rischio di
// spam anonimo. Non fa mai fallire il flusso che la chiama in caso di errore.
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event } = await req.json();
    if (!ALLOWED_EVENTS.includes(event)) {
      return new Response(JSON.stringify({ error: "Evento non valido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: trial } = await adminClient
      .from("trial_registrations")
      .select("id, login_count")
      .eq("user_id", user.id)
      .maybeSingle();

    // Non è (più) un utente in prova: nulla da tracciare, non è un errore.
    if (!trial) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedEvent = event as AllowedEvent;

    if (typedEvent === "password_set") {
      // Evita duplicati se il frontend chiama due volte.
      const { data: existing } = await adminClient
        .from("trial_activity_log")
        .select("id")
        .eq("trial_id", trial.id)
        .eq("action", "password_set")
        .maybeSingle();
      if (!existing) {
        await adminClient.from("trial_activity_log").insert({ trial_id: trial.id, action: "password_set" });
      }
    } else if (typedEvent === "login") {
      const isFirstLogin = !trial.login_count || trial.login_count === 0;
      await adminClient
        .from("trial_registrations")
        .update({
          login_count: (trial.login_count || 0) + 1,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", trial.id);
      if (isFirstLogin) {
        await adminClient.from("trial_activity_log").insert({ trial_id: trial.id, action: "first_login" });
      }
    } else if ((PRODUCT_ACTION_EVENTS as readonly string[]).includes(typedEvent)) {
      // Uso reale del prodotto: si registra ad ogni occorrenza (niente dedup),
      // cosi' la timeline riflette anche l'attivita' piu' recente.
      await adminClient.from("trial_activity_log").insert({ trial_id: trial.id, action: typedEvent });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("log-trial-event error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
