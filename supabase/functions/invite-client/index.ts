import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorizzato");

    const { client_id } = await req.json();
    if (!client_id) throw new Error("client_id richiesto");

    // Get client data
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("email, first_name, last_name, user_id, tenant_id")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) throw new Error("Cliente non trovato");
    if (!client.email) throw new Error("Il cliente non ha un indirizzo email");
    if (client.user_id) throw new Error("Il cliente ha già un account attivo");

    // Create auth user (email pre-confirmed)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${client.first_name} ${client.last_name}`,
        is_client: true,
      },
    });

    if (authErr) throw authErr;

    // Link user_id to client record
    const { error: updateErr } = await supabaseAdmin
      .from("clients")
      .update({ user_id: authData.user.id })
      .eq("id", client_id);

    if (updateErr) throw updateErr;

    // Generate password recovery link for the client to set their password
    const origin = req.headers.get("origin") || "";
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: client.email,
      options: {
        redirectTo: `${origin}/cliente/set-password`,
      },
    });

    if (linkErr) throw linkErr;

    // Save a copy to MySQL
    try {
      const mysqlUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mysql-demo-leads`;
      await fetch(mysqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          action: "insert_invite",
          client_id,
          tenant_id: client.tenant_id,
          email: client.email,
          first_name: client.first_name,
          last_name: client.last_name,
          user_id: authData.user.id,
        }),
      });
    } catch (mysqlErr) {
      console.error("MySQL invite copy failed:", mysqlErr);
      // Non-blocking: don't fail the invite if MySQL copy fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        recovery_link: linkData?.properties?.action_link,
        message: `Account creato per ${client.email}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
