import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, pensione_name, message } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Nome e email sono obbligatori" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL");
    if (!NOTIFICATION_EMAIL) {
      throw new Error("NOTIFICATION_EMAIL is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !LOVABLE_API_KEY) {
      throw new Error("Missing required environment variables");
    }

    const emailBody = `
      <h2>Nuova Richiesta Demo Live</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nome</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
        ${phone ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Telefono</td><td style="padding:8px;border-bottom:1px solid #eee;">${phone}</td></tr>` : ''}
        ${pensione_name ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Nome Pensione</td><td style="padding:8px;border-bottom:1px solid #eee;">${pensione_name}</td></tr>` : ''}
        ${message ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Messaggio</td><td style="padding:8px;border-bottom:1px solid #eee;">${message}</td></tr>` : ''}
      </table>
      <p style="margin-top:16px;color:#888;font-size:12px;">Inviato da Pet Hotel Manager Landing Page</p>
    `;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        to: NOTIFICATION_EMAIL,
        subject: `[Demo Request] ${name} - ${email}`,
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Email send failed:", errText);
      // Don't fail the request - still acknowledge the demo request
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing demo request:", error);
    return new Response(JSON.stringify({ error: "Errore nell'invio della richiesta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
