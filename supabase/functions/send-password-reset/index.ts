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

function resetPasswordHtml(resetLink: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>Hai richiesto di reimpostare la password del tuo account.</p>
      <p>Clicca il pulsante qui sotto per scegliere una nuova password:</p>
      <a href="${resetLink}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Reimposta la password
      </a>
      <p style="color:#555;font-size:14px;">
        Il link è valido per 24 ore. Se non hai richiesto tu questa email, puoi ignorarla:
        la tua password resterà invariata.
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${resetLink}" style="color:#c45a12;word-break:break-all;">${resetLink}</a>
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

    const { email, redirectTo } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";

    // Always respond with success regardless of whether the account exists,
    // to avoid leaking which emails are registered (same behaviour as
    // Supabase's own resetPasswordForEmail).
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: redirectTo || `${siteUrl}/reset-password` },
    });

    if (!linkErr && linkData?.properties?.action_link) {
      await sendEmail(
        normalizedEmail,
        "Reimposta la tua password — PetHotelManager",
        resetPasswordHtml(linkData.properties.action_link),
      );
    } else if (linkErr) {
      console.warn("[send-password-reset] generateLink error (not surfaced to client):", linkErr.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-password-reset error:", error);
    // Still return a generic success shape to the client to avoid enumeration;
    // the real error is logged server-side for debugging.
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
