import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_TENANT_SLUG = "la-zampa-felice";

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already has roles (already provisioned)
    const { data: existingRoles } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingRoles && existingRoles.length > 0) {
      return new Response(JSON.stringify({ already_provisioned: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = user.user_metadata || {};
    const fullName = metadata.full_name || user.email;

    // Find demo tenant
    const { data: demoTenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", DEMO_TENANT_SLUG)
      .single();

    if (tenantError || !demoTenant) {
      console.error("Demo tenant not found:", tenantError);
      return new Response(JSON.stringify({ error: "Demo tenant not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = demoTenant.id;

    // Get trial days from landing_config
    const { data: landingConfig } = await adminClient
      .from("landing_config")
      .select("trial_days")
      .limit(1)
      .single();
    const trialDays = landingConfig?.trial_days || 3;

    // 1. Assign titolare role on demo tenant
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: user.id,
      role: "titolare",
      tenant_id: tenantId,
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 2. Update profile with demo tenant_id
    await adminClient
      .from("profiles")
      .update({ tenant_id: tenantId, full_name: fullName })
      .eq("user_id", user.id);

    // 3. Create trial_registration (skip if already exists)
    const { data: existingTrial } = await adminClient
      .from("trial_registrations")
      .select("id, trial_end")
      .eq("user_id", user.id)
      .maybeSingle();

    let trialEnd: Date;

    if (!existingTrial) {
      const trialStart = new Date();
      trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

      const { error: trialError } = await adminClient
        .from("trial_registrations")
        .insert({
          user_id: user.id,
          email: user.email!,
          full_name: fullName,
          pet_type: metadata.pet_type || "gatti",
          tenant_id: tenantId,
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
        });

      if (trialError) {
        console.error("Error creating trial registration:", trialError);
      }
    } else {
      trialEnd = new Date(existingTrial.trial_end);
    }

    // Update profile phone from metadata if available
    if (metadata.phone) {
      await adminClient
        .from("profiles")
        .update({ phone: metadata.phone })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenantId, trial_end: trialEnd.toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("provision-trial error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
