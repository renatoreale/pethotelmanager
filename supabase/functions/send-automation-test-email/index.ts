import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stessa intestazione + footer (logo, nome pensione, colore primario del
// sito, icone social, riferimenti di contatto) su tutte le email verso i
// clienti — duplicata in ogni edge function per lo stesso motivo delle
// altre costanti di questo progetto: nessun import condiviso tra le
// funzioni. Se la pensione non ha caricato un logo, si usa quello di
// Pet Hotel Manager (servito staticamente da /logo.png).
const BRAND_COLOR = "#D2691E";
const DEFAULT_LOGO_URL = `${Deno.env.get("SITE_URL") || ""}/logo.png`;

interface EmailTenantInfo {
  name: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  cap?: string | null;
  phone?: string | null;
  email?: string | null;
  social_facebook_url?: string | null;
  social_instagram_url?: string | null;
  social_tiktok_url?: string | null;
  social_whatsapp_url?: string | null;
}

function socialBadge(url: string | null | undefined, label: string, bg: string): string {
  if (!url) return "";
  return `<a href="${url}" style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:${bg};color:#fff;border-radius:50%;text-decoration:none;font-family:sans-serif;font-size:11px;font-weight:bold;margin:0 3px 0 0;">${label}</a>`;
}

function emailShell(tenant: EmailTenantInfo, bodyHtml: string): string {
  const logoUrl = tenant.logo_url || DEFAULT_LOGO_URL;
  const socials = [
    socialBadge(tenant.social_facebook_url, "f", "#1877F2"),
    socialBadge(tenant.social_instagram_url, "IG", "#E4405F"),
    socialBadge(tenant.social_tiktok_url, "TT", "#000000"),
    socialBadge(tenant.social_whatsapp_url, "WA", "#25D366"),
  ].filter(Boolean).join("");
  const addressLine = [tenant.address, [tenant.cap, tenant.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const contactLine = [tenant.phone, tenant.email].filter(Boolean).join(" · ");

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <div style="background:${BRAND_COLOR};padding:20px 24px;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="width:76px;vertical-align:middle;">
              <img src="${logoUrl}" alt="${tenant.name}" width="68" height="68" style="height:68px;width:68px;object-fit:contain;border-radius:10px;background:#fff;display:block;">
            </td>
            <td style="vertical-align:middle;padding-left:14px;">
              <div style="color:#fff;font-size:19px;font-weight:700;font-family:sans-serif;">${tenant.name}</div>
              ${socials ? `<div style="margin-top:8px;">${socials}</div>` : ""}
            </td>
          </tr>
        </table>
      </div>
      <div style="padding:32px 24px;">
        ${bodyHtml}
      </div>
      <div style="background:${BRAND_COLOR};padding:16px 24px;text-align:center;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:700;font-family:sans-serif;">${tenant.name}</p>
        ${addressLine ? `<p style="margin:4px 0 0;color:#ffffffdd;font-size:12px;font-family:sans-serif;">${addressLine}</p>` : ""}
        ${contactLine ? `<p style="margin:4px 0 0;color:#ffffffdd;font-size:12px;font-family:sans-serif;">${contactLine}</p>` : ""}
      </div>
    </div>
  `;
}

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

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, logo_url, address, city, cap, phone, email, social_facebook_url, social_instagram_url, social_tiktok_url, social_whatsapp_url")
      .eq("id", tenantId)
      .single();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const bodyHtml = String(bodyText)
      .split("\n")
      .map((line: string) => (line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`))
      .join("");
    const displayName = tenant?.name || tenantName || "Pet Hotel Manager";
    const html = emailShell({ ...(tenant as any), name: displayName }, `
      <div style="background:#fff3cd;border:1px solid #ffe69c;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:12px;">
        Email di test — non è stata inviata a un cliente reale.
      </div>
      ${bodyHtml}
    `);
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
