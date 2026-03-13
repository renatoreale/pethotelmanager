import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, token } = await req.json();

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "Email e token sono obbligatori" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !LOVABLE_API_KEY) {
      throw new Error("Missing required environment variables");
    }

    // Get frontend URL from request origin or referer
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const frontendUrl = origin || "https://id-preview--b7862e24-c51d-4bcc-b2f3-fb7cea3d3cd5.lovable.app";
    const confirmUrl = `${frontendUrl}/confirm-demo?token=${token}`;

    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:24px;color:#1a1a1a;">🐾 Pet Hotel Manager</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <p style="margin:0;font-size:16px;color:#333;">Ciao <strong>${firstName || ""} ${lastName || ""}</strong>,</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:16px;color:#333;line-height:1.5;">
                Grazie per aver richiesto la prova gratuita di Pet Hotel Manager! 
                Clicca il pulsante qui sotto per confermare la tua richiesta e accedere alla demo.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#18181b;border-radius:8px;">
                    <a href="${confirmUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Conferma e accedi alla demo
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#666;line-height:1.5;">
                Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br/>
                <a href="${confirmUrl}" style="color:#2563eb;word-break:break-all;">${confirmUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #eee;padding-top:16px;">
              <p style="margin:0;font-size:12px;color:#999;">
                Questa email è stata inviata da Pet Hotel Manager. Se non hai richiesto una demo, ignora questa email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        to: email,
        subject: "Conferma la tua richiesta demo - Pet Hotel Manager",
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Email send failed:", errText);
      return new Response(JSON.stringify({ error: "Errore nell'invio dell'email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also notify admin
    const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL");
    if (NOTIFICATION_EMAIL) {
      const adminBody = `
        <h2>Nuova Richiesta Demo</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nome</td><td style="padding:8px;border-bottom:1px solid #eee;">${firstName} ${lastName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
          ${phone ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Telefono</td><td style="padding:8px;border-bottom:1px solid #eee;">${phone}</td></tr>` : ''}
        </table>
      `;
      await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: NOTIFICATION_EMAIL,
          subject: `[Demo Request] ${firstName} ${lastName} - ${email}`,
          html: adminBody,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Errore nell'invio della richiesta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
