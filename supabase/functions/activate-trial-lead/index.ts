import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token mancante" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trova il lead
    const { data: lead, error: leadError } = await adminClient
      .from("demo_leads")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ status: "not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se già confermato, informa il frontend
    if (lead.confirmed) {
      return new Response(JSON.stringify({ status: "already_confirmed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = [lead.full_name, lead.last_name].filter(Boolean).join(" ");

    // Genera invite link (crea utente se non esiste + link imposta password)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: lead.email,
      options: {
        data: {
          is_trial: true,
          full_name: fullName,
        },
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: "Errore nella creazione dell'account" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const setPasswordLink = linkData.properties.action_link;

    // Invia email con il link per impostare la password
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#c45a12;font-size:24px;margin:0;">PetHotelManager</h1>
          </div>
          <h2 style="color:#1a1a1a;font-size:20px;">Ciao ${fullName}!</h2>
          <p style="color:#333;font-size:16px;line-height:1.6;">
            Il tuo account è stato creato. Clicca il pulsante qui sotto per impostare la tua password e accedere alla prova gratuita:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${setPasswordLink}"
               style="background-color:#c45a12;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
              Imposta la tua password
            </a>
          </div>
          <p style="color:#666;font-size:14px;line-height:1.5;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
            <a href="${setPasswordLink}" style="color:#c45a12;word-break:break-all;">${setPasswordLink}</a>
          </p>
          <p style="color:#999;font-size:13px;line-height:1.5;">
            Il link è valido per 24 ore.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;text-align:center;">
            PetHotelManager — Il gestionale per la tua pensione per animali
          </p>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: lead.email,
          subject: "Imposta la tua password — PetHotelManager",
          html,
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }
    }

    // Marca il lead come confermato
    await adminClient
      .from("demo_leads")
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq("token", token);

    return new Response(JSON.stringify({ status: "confirmed", email: lead.email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("activate-trial-lead error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
