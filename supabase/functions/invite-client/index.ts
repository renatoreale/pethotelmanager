import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callMySQL(action: string, params: Record<string, any>) {
  const mysqlUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mysql-demo-leads`;
  const res = await fetch(mysqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorizzato");

    const { client_id, action } = await req.json();
    if (!client_id) throw new Error("client_id richiesto");

    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("email, first_name, last_name, user_id, tenant_id, portal_activated")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) throw new Error("Cliente non trovato");
    if (!client.email) throw new Error("Il cliente non ha un indirizzo email");

    const origin = req.headers.get("origin") || "";

    // --- RESEND INVITE ---
    if (action === "resend") {
      if (!client.user_id) throw new Error("Il cliente non ha ancora un account. Crea prima l'invito.");

      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: client.email,
        options: { redirectTo: `${origin}/cliente/set-password` },
      });
      if (linkErr) throw linkErr;
      const recoveryLink = linkData?.properties?.action_link;

      // Delete old invites and insert new one in MySQL
      try {
        await callMySQL("delete_invites", { client_id });
        await callMySQL("insert_invite", {
          client_id,
          tenant_id: client.tenant_id,
          email: client.email,
          first_name: client.first_name,
          last_name: client.last_name,
          user_id: client.user_id,
          recovery_link: recoveryLink,
        });
      } catch (e) {
        console.error("MySQL resend error:", e);
      }

      return new Response(
        JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Nuovo link generato per ${client.email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- RESET PASSWORD ---
    if (action === "reset_password") {
      if (!client.user_id) throw new Error("Il cliente non ha ancora un account.");
      if (!client.portal_activated) throw new Error("Il cliente non ha ancora attivato il portale.");

      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: client.email,
        options: { redirectTo: `${origin}/cliente/set-password` },
      });
      if (linkErr) throw linkErr;
      const recoveryLink = linkData?.properties?.action_link;

      // Save reset request to MySQL
      try {
        await callMySQL("insert_password_reset", {
          client_id,
          tenant_id: client.tenant_id,
          email: client.email,
          user_id: client.user_id,
          recovery_link: recoveryLink,
        });
      } catch (e) {
        console.error("MySQL reset password error:", e);
      }

      return new Response(
        JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Link reset password generato per ${client.email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- CREATE INVITE ---
    if (client.user_id) throw new Error("Il cliente ha già un account attivo");

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${client.first_name} ${client.last_name}`,
        is_client: true,
      },
    });
    if (authErr) throw authErr;

    const { error: updateErr } = await supabaseAdmin
      .from("clients")
      .update({ user_id: authData.user.id })
      .eq("id", client_id);
    if (updateErr) throw updateErr;

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: client.email,
      options: { redirectTo: `${origin}/cliente/set-password` },
    });
    if (linkErr) throw linkErr;
    const recoveryLink = linkData?.properties?.action_link;

    try {
      await callMySQL("insert_invite", {
        client_id,
        tenant_id: client.tenant_id,
        email: client.email,
        first_name: client.first_name,
        last_name: client.last_name,
        user_id: authData.user.id,
        recovery_link: recoveryLink,
      });
    } catch (e) {
      console.error("MySQL invite copy failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Account creato per ${client.email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
