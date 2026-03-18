import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string, fromName: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
  if (!resendKey) {
    console.error("RESEND_API_KEY non configurata");
    return;
  }
  const from = `${fromName} <${fromEmail}>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

function inviteEmailHtml(firstName: string, tenantName: string, recoveryLink: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#1a1a1a;">Benvenuto nel portale clienti di ${tenantName}</h2>
      <p>Ciao <strong>${firstName}</strong>,</p>
      <p>Sei stato invitato ad accedere all'area riservata clienti. Clicca sul pulsante qui sotto per impostare la tua password e attivare l'account.</p>
      <a href="${recoveryLink}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#e67e22;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
        Attiva il tuo account
      </a>
      <p style="color:#666;font-size:13px;">Il link è valido per 24 ore. Se non hai richiesto questo accesso, ignora questa email.</p>
      <p style="color:#999;font-size:12px;">${tenantName}</p>
    </div>
  `;
}

function resetPasswordEmailHtml(firstName: string, tenantName: string, recoveryLink: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#1a1a1a;">Reset password - ${tenantName}</h2>
      <p>Ciao <strong>${firstName}</strong>,</p>
      <p>È stata richiesta la reimpostazione della tua password. Clicca sul pulsante qui sotto per scegliere una nuova password.</p>
      <a href="${recoveryLink}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#e67e22;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
        Reimposta password
      </a>
      <p style="color:#666;font-size:13px;">Il link è valido per 24 ore. Se non hai richiesto questa operazione, ignora questa email.</p>
      <p style="color:#999;font-size:12px;">${tenantName}</p>
    </div>
  `;
}

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

    // Fetch tenant name for email
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", client.tenant_id)
      .single();
    const tenantName = tenant?.name || "La Pensione";

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";

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

      await sendEmail(
        client.email,
        `Il tuo accesso al portale clienti - ${tenantName}`,
        inviteEmailHtml(client.first_name, tenantName, recoveryLink),
        tenantName,
      );

      try {
        await callMySQL("delete_invites", { client_id });
        await callMySQL("insert_invite", {
          client_id, tenant_id: client.tenant_id, email: client.email,
          first_name: client.first_name, last_name: client.last_name,
          user_id: client.user_id, recovery_link: recoveryLink,
        });
      } catch (e) {
        console.error("MySQL resend error:", e);
      }

      await supabaseAdmin.from("email_logs").insert({
        tenant_id: client.tenant_id, client_id, direction: "sent",
        email_type: "invito", subject: `Benvenuto nel portale clienti - ${tenantName}`,
        recipient_email: client.email, status: "sent",
        body_html: inviteEmailHtml(client.first_name, tenantName, recoveryLink),
      });

      return new Response(
        JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Invito inviato a ${client.email}` }),
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

      await sendEmail(
        client.email,
        `Reset password - ${tenantName}`,
        resetPasswordEmailHtml(client.first_name, tenantName, recoveryLink),
        tenantName,
      );

      try {
        await callMySQL("insert_password_reset", {
          client_id, tenant_id: client.tenant_id, email: client.email,
          user_id: client.user_id, recovery_link: recoveryLink,
        });
      } catch (e) {
        console.error("MySQL reset password error:", e);
      }

      await supabaseAdmin.from("email_logs").insert({
        tenant_id: client.tenant_id, client_id, direction: "sent",
        email_type: "reset_password", subject: `Reset password - ${tenantName}`,
        recipient_email: client.email, status: "sent",
        body_html: resetPasswordEmailHtml(client.first_name, tenantName, recoveryLink),
      });

      return new Response(
        JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Email reset password inviata a ${client.email}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- CREATE INVITE ---
    if (client.user_id) throw new Error("Il cliente ha già un account attivo");

    let authUserId: string;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: client.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${client.first_name} ${client.last_name}`,
        is_client: true,
      },
    });

    if (authErr) {
      if (authErr.message.includes("already been registered") || authErr.message.includes("already registered")) {
        // L'utente esiste in auth ma non è collegato al cliente — lo recuperiamo
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = users.find((u: any) => u.email === client.email);
        if (!existingUser) throw new Error("Utente già registrato ma non trovato in auth");
        authUserId = existingUser.id;
      } else {
        throw authErr;
      }
    } else {
      authUserId = authData.user.id;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("clients")
      .update({ user_id: authUserId })
      .eq("id", client_id);
    if (updateErr) throw updateErr;

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: client.email,
      options: { redirectTo: `${origin}/cliente/set-password` },
    });
    if (linkErr) throw linkErr;
    const recoveryLink = linkData?.properties?.action_link;

    await sendEmail(
      client.email,
      `Benvenuto nel portale clienti - ${tenantName}`,
      inviteEmailHtml(client.first_name, tenantName, recoveryLink),
      tenantName,
    );

    try {
      await callMySQL("insert_invite", {
        client_id, tenant_id: client.tenant_id, email: client.email,
        first_name: client.first_name, last_name: client.last_name,
        user_id: authUserId, recovery_link: recoveryLink,
      });
    } catch (e) {
      console.error("MySQL invite copy failed:", e);
    }

    await supabaseAdmin.from("email_logs").insert({
      tenant_id: client.tenant_id, client_id, direction: "sent",
      email_type: "invito", subject: `Benvenuto nel portale clienti - ${tenantName}`,
      recipient_email: client.email, status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, recovery_link: recoveryLink, message: `Invito inviato a ${client.email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
