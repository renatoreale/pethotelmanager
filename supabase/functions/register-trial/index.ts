import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISPOSABLE_DOMAINS = [
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","dispostable.com","trashmail.com",
  "fakeinbox.com","maildrop.cc","10minutemail.com","temp-mail.org",
  "getnada.com","mohmal.com","emailondeck.com","discard.email",
  "test.com","example.com","test.it","prova.com","prova.it",
];

async function sendEmail(to: string, subject: string, html: string) {
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
      from: `PetHotelManager <${fromEmail}>`,
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

function trialWelcomeHtml(firstName: string, recoveryLink: string, trialDays: number): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>Ciao <strong>${firstName}</strong>!</p>
      <p>Grazie per aver richiesto la prova gratuita di PetHotelManager!<br/>
      Clicca il pulsante qui sotto per impostare la tua password e accedere subito:</p>
      <a href="${recoveryLink}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Imposta la tua password
      </a>
      <p style="color:#555;font-size:14px;">
        Avrai <strong>${trialDays} giorni</strong> di accesso gratuito e completo —
        nessuna carta di credito richiesta.<br/>
        Il link è valido per 24 ore.
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${recoveryLink}" style="color:#c45a12;word-break:break-all;">${recoveryLink}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
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

    const { email, firstName, lastName, phone } = await req.json();

    // Validation
    if (!firstName || firstName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il nome deve avere almeno 2 caratteri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lastName || lastName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il cognome deve avere almeno 2 caratteri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const domain = email.trim().toLowerCase().split("@")[1];
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return new Response(JSON.stringify({ error: "Usa un indirizzo email reale" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: "Il telefono è obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Get trial days
    const { data: landingConfig } = await supabaseAdmin
      .from("landing_config")
      .select("trial_days")
      .limit(1)
      .single();
    const trialDays = landingConfig?.trial_days || 14;

    // Create user in Supabase Auth
    let authUserId: string;
    let isNewUser = true;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        is_trial: true,
        phone: phone.trim(),
      },
    });

    if (authErr) {
      if (authErr.message.includes("already been registered") || authErr.message.includes("already registered")) {
        // User exists — resend recovery email
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = users.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
        if (!existing) throw new Error("Utente già registrato ma non trovato");
        authUserId = existing.id;
        isNewUser = false;
        // Ensure is_trial is set
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: { ...existing.user_metadata, is_trial: true },
        });
      } else {
        throw authErr;
      }
    } else {
      authUserId = authData.user.id;
    }

    // Generate recovery link → /reset-password
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr) throw linkErr;
    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) throw new Error("Impossibile generare il link di accesso");

    // Send welcome email
    await sendEmail(
      email.trim().toLowerCase(),
      `Imposta la tua password — PetHotelManager`,
      trialWelcomeHtml(firstName.trim(), recoveryLink, trialDays),
    );

    return new Response(
      JSON.stringify({ success: true, is_new_user: isNewUser }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("register-trial error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
