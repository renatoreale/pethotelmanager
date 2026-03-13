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

    // Authenticate user
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

    // Check user metadata for trial flag
    const metadata = user.user_metadata || {};
    if (!metadata.is_trial) {
      return new Response(JSON.stringify({ error: "Not a trial user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const petType = metadata.pet_type || "gatti";
    const fullName = metadata.full_name || user.email;

    // Get trial days from landing_config
    const { data: landingConfig } = await adminClient
      .from("landing_config")
      .select("trial_days")
      .limit(1)
      .single();
    const trialDays = landingConfig?.trial_days || 3;

    // 1. Create tenant
    const slug = `trial-${user.id.substring(0, 8)}-${Date.now()}`;
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: `Pensione di ${fullName}`,
        slug,
        pet_type: petType,
      })
      .select("id")
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      return new Response(JSON.stringify({ error: "Failed to create tenant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Assign titolare role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: user.id,
      role: "titolare",
      tenant_id: tenant.id,
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 3. Update profile with tenant_id
    await adminClient
      .from("profiles")
      .update({ tenant_id: tenant.id, full_name: fullName })
      .eq("user_id", user.id);

    // 4. Create trial_registration
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const { error: trialError } = await adminClient
      .from("trial_registrations")
      .insert({
        user_id: user.id,
        email: user.email!,
        full_name: fullName,
        pet_type: petType,
        tenant_id: tenant.id,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
      });

    if (trialError) {
      console.error("Error creating trial registration:", trialError);
    }

    // 5. Copy global templates to the new tenant
    await adminClient.rpc("copy_global_templates_to_tenant", { _tenant_id: tenant.id });

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenant.id, trial_end: trialEnd.toISOString() }),
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
