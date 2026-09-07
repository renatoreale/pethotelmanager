import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Invio di test per i template delle automazioni (Impostazioni Pensione >
// Template Email > Automazioni): il subject e il testo arrivano già
// renderizzati dal frontend (con dati di esempio al posto dei {{var}}),
// così questa funzione non tocca mai prenotazioni o clienti reali — serve
// solo a vedere come apparirà l'email, inviata all'indirizzo indicato sul
// momento da chi sta modificando il template.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, bodyText, tenantId, tenantName } = await req.json();
    if (!to || !subject || !bodyText || !tenantId) {
      throw new Error("Parametri mancanti (to, subject, bodyText, tenantId)");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const bodyHtml = String(bodyText)
      .split("\n")
      .map((line: string) => (line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`))
      .join("");
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <div style="background:#fff3cd;border:1px solid #ffe69c;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:12px;">
          Email di test — non è stata inviata a un cliente reale.
        </div>
        ${bodyHtml}
      </div>
    `;

    const displayName = tenantName || "Pet Hotel Manager";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${displayName} <${fromEmail}>`, to: [to], subject: `[TEST] ${subject}`, html }),
    });
    const result = await res.json().catch(() => null);

    await supabaseAdmin.from("email_log").insert({
      tenant_id: tenantId,
      recipient_email: to,
      subject: `[TEST] ${subject}`,
      status: res.ok ? "sent" : "failed",
      provider_message_id: result?.id ?? null,
      sent_at: res.ok ? new Date().toISOString() : null,
      error_message: res.ok ? null : JSON.stringify(result),
      metadata: { type: "automation_test" },
    });

    if (!res.ok) throw new Error(result?.message || "Invio fallito");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
