import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_TENANT_SLUG = "la-zampa-felice";

// Ban di lunghissima durata, stessa costante usata da admin-ban-user
// per l'auto-ban dei trial scaduti.
const BAN_DURATION = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Interruttore di sicurezza: finche' il nuovo flusso trial non e'
    // attivo, questa pulizia non fa nulla (non possono comunque esistere
    // tenant is_trial = true da ripulire, ma il controllo esplicito evita
    // sorprese se qualcuno collega lo scheduler prima di validare il flag).
    const { data: landingConfig } = await adminClient
      .from("landing_config")
      .select("new_trial_flow_enabled")
      .limit(1)
      .single();

    if (landingConfig?.new_trial_flow_enabled !== true) {
      return new Response(
        JSON.stringify({ success: true, skipped: "new_trial_flow_enabled is off", purged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = new Date();

    // Trial scaduti, mai convertiti, non ancora ripuliti.
    const { data: expiredTrials, error: trialsError } = await adminClient
      .from("trial_registrations")
      .select("id, user_id, tenant_id, email, trial_end")
      .eq("is_converted", false)
      .lt("trial_end", now.toISOString())
      .not("tenant_id", "is", null);

    if (trialsError) throw trialsError;

    let banned = 0;
    let purged = 0;
    let skipped = 0;
    const errors: { trial_id: string; error: string }[] = [];

    for (const trial of expiredTrials || []) {
      try {
        const tenantId = trial.tenant_id as string;

        const { data: tenant, error: tenantError } = await adminClient
          .from("tenants")
          .select("id, slug, name, is_trial, trial_purged_at")
          .eq("id", tenantId)
          .maybeSingle();
        if (tenantError) throw tenantError;

        if (!tenant) {
          skipped++;
          continue;
        }

        // Gia' ripulito in una run precedente.
        if (tenant.trial_purged_at) {
          skipped++;
          continue;
        }

        // --- Controlli di sicurezza: MAI cancellare un tenant che non ---
        // --- sia inequivocabilmente una pensione di prova dedicata.   ---
        const nameLooksLikeTrial = /trial$/i.test((tenant.name || "").trim());
        if (
          tenant.slug === DEMO_TENANT_SLUG ||
          tenant.is_trial !== true ||
          !nameLooksLikeTrial
        ) {
          console.warn(`[cleanup-expired-trials] Skipping tenant ${tenantId} (${tenant.name}): non e' una pensione di prova dedicata`);
          skipped++;
          continue;
        }

        // Il tenant deve essere associato a esattamente questa registrazione
        // di prova, mai condiviso con altre.
        const { count: linkedTrialsCount, error: countError } = await adminClient
          .from("trial_registrations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId);
        if (countError) throw countError;

        if (linkedTrialsCount !== 1) {
          console.warn(`[cleanup-expired-trials] Skipping tenant ${tenantId}: collegato a ${linkedTrialsCount} trial_registrations (atteso 1)`);
          skipped++;
          continue;
        }

        // Disattiva l'account (stessa modalita' dell'auto-ban esistente).
        const { error: banError } = await adminClient.auth.admin.updateUserById(trial.user_id, {
          ban_duration: BAN_DURATION,
        });
        if (banError) {
          console.error(`[cleanup-expired-trials] Errore ban utente ${trial.user_id}:`, banError.message);
        } else {
          banned++;
        }

        // Svuota SOLO i dati operativi di questo tenant. trial_registrations
        // e trial_activity_log restano intatti per lo storico funnel.
        const { error: purgeError } = await adminClient.rpc("purge_trial_tenant_data", { _tenant_id: tenantId });
        if (purgeError) throw purgeError;
        purged++;

        console.log(`[cleanup-expired-trials] Purged trial tenant ${tenantId} ("${tenant.name}") for user ${trial.user_id}`);
      } catch (perTrialError) {
        console.error(`[cleanup-expired-trials] Error for trial ${trial.id}:`, perTrialError);
        errors.push({ trial_id: trial.id, error: (perTrialError as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: expiredTrials?.length || 0, banned, purged, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("cleanup-expired-trials error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
