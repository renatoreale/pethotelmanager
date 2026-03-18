import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string, fromName: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";
  if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Resend error: " + err);
  }
}

function trialInviteHtml(firstName: string, recoveryLink: string, trialDays: number): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>Ciao <strong>${firstName}</strong>!</p>
      <p>Grazie per aver richiesto la prova gratuita di PetHotelManager!<br/>
      Clicca il pulsante qui sotto per impostare la tua password e accedere subito:</p>
      <a href="${recoveryLink}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
        Imposta la tua password
      </a>
      <p style="color:#666;font-size:13px;">
        Avrai <strong>${trialDays} giorni</strong> di accesso gratuito completo — nessuna carta di credito richiesta.<br/>
        Il link è valido per 24 ore.
      </p>
      <p style="color:#999;font-size:12px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${recoveryLink}" style="color:#c45a12;word-break:break-all;">${recoveryLink}</a>
      </p>
      <p style="color:#999;font-size:12px;">PetHotelManager</p>
    </div>
  `;
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

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorizzato");

    const { email, firstName, lastName } = await req.json();
    if (!email || !firstName) throw new Error("email e firstName richiesti");

    // Get trial days from landing_config
    const { data: landingConfig } = await supabaseAdmin
      .from("landing_config")
      .select("trial_days")
      .limit(1)
      .single();
    const trialDays = landingConfig?.trial_days || 14;

    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";
    const fullName = `${firstName} ${lastName || ""}`.trim();

    // Create user in Supabase Auth with is_trial: true metadata
    let authUserId: string;
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, is_trial: true },
    });

    if (authErr) {
      // User already exists — find and update metadata
      if (authErr.message.includes("already been registered") || authErr.message.includes("already registered")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = users.find((u: any) => u.email === email);
        if (!existing) throw new Error("Utente già registrato ma non trovato in auth");
        authUserId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: { ...existing.user_metadata, is_trial: true },
        });
      } else {
        throw authErr;
      }
    } else {
      authUserId = authData.user.id;
    }

    // Generate recovery link pointing to /reset-password
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr) throw linkErr;
    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) throw new Error("Impossibile generare il link di recupero");

    // Send email via Resend
    await sendEmail(
      email,
      "Imposta la tua password — PetHotelManager",
      trialInviteHtml(firstName, recoveryLink, trialDays),
      "PetHotelManager",
    );

    return new Response(
      JSON.stringify({ success: true, user_id: authUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("invite-trial-user error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
