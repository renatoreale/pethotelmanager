import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "0",
};

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

function confirmSignupHtml(confirmLink: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>Grazie per esserti registrato a PetHotelManager!</p>
      <p>Clicca il pulsante qui sotto per confermare la tua email e impostare la password:</p>
      <a href="${confirmLink}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Conferma e imposta la password
      </a>
      <p style="color:#555;font-size:14px;">
        Il link è valido per 24 ore.
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${confirmLink}" style="color:#c45a12;word-break:break-all;">${confirmLink}</a>
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

    const { email, fullName, redirectTo } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";
    const trimmedFullName = fullName ? String(fullName).trim() : undefined;

    // Same pattern as register-trial/invite-client/activate-purchase: create the
    // account server-side (no password yet), then send a recovery-type link so
    // the user sets their password on /reset-password after clicking through —
    // avoids asking for a password twice (once here, once again on that page).
    const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { full_name: trimmedFullName },
    });

    if (authErr) {
      if (authErr.message?.toLowerCase().includes("already")) {
        // Don't confirm/deny account existence, don't touch the existing account.
        console.warn("[register-user] signup attempt on existing email (not surfaced to client):", normalizedEmail);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw authErr;
    }

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: redirectTo || `${siteUrl}/reset-password` },
    });
    if (linkErr) throw linkErr;

    if (linkData?.properties?.action_link) {
      await sendEmail(
        normalizedEmail,
        "Conferma la tua email — PetHotelManager",
        confirmSignupHtml(linkData.properties.action_link),
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("register-user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Errore durante la registrazione" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
