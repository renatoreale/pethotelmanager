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
        ${socials ? `<div style="margin-top:10px;">${socials}</div>` : ""}
      </div>
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorizzato");

    const { booking_id, pdf_base64, filename } = await req.json();
    if (!booking_id || !pdf_base64) throw new Error("booking_id e pdf_base64 richiesti");

    // Fetch booking with client and tenant
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("booking_number, tenant_id, check_in_date, check_out_date, client_id, client:clients(first_name, last_name, email)")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) throw new Error("Preventivo non trovato");
    const client = booking.client as any;
    if (!client?.email) throw new Error("Il cliente non ha un indirizzo email");

    // Fetch tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, logo_url, address, city, cap, phone, email, social_facebook_url, social_instagram_url, social_tiktok_url, social_whatsapp_url, preventivo_email_body, preventivo_email_subject")
      .eq("id", booking.tenant_id)
      .single();
    const tenantName = tenant?.name || "La Pensione";

    // Format dates Italian style (dd/MM/yyyy)
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    };
    const checkInFormatted = booking.check_in_date ? formatDate(booking.check_in_date) : "";
    const checkOutFormatted = booking.check_out_date ? formatDate(booking.check_out_date) : "";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const pdfFilename = filename || `Preventivo_${booking.booking_number}.pdf`;

    const defaultBody = `Ciao {{nome_cliente}},\n\nti inviamo in allegato il preventivo n° {{numero_preventivo}} per il tuo soggiorno.\n\nPer qualsiasi domanda o per confermare la prenotazione, rispondi a questa email o contattaci direttamente.\n\nA presto,\n{{nome_pensione}}`;
    const rawBody = (tenant?.preventivo_email_body || defaultBody)
      .replace(/\{\{nome_cliente\}\}/g, client.first_name)
      .replace(/\{\{numero_preventivo\}\}/g, booking.booking_number)
      .replace(/\{\{nome_pensione\}\}/g, tenantName)
      .replace(/\{\{data_checkin\}\}/g, checkInFormatted)
      .replace(/\{\{data_checkout\}\}/g, checkOutFormatted);

    const bodyHtml = rawBody
      .split("\n")
      .map((line: string) => line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`)
      .join("");

    const html = emailShell({ ...(tenant as any), name: tenantName }, bodyHtml);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${tenantName} <${fromEmail}>`,
        to: [client.email],
        subject: (tenant?.preventivo_email_subject || `Richiesta dal {{data_checkin}} al {{data_checkout}}`)
          .replace(/\{\{data_checkin\}\}/g, checkInFormatted)
          .replace(/\{\{data_checkout\}\}/g, checkOutFormatted)
          .replace(/\{\{nome_cliente\}\}/g, client.first_name)
          .replace(/\{\{numero_preventivo\}\}/g, booking.booking_number)
          .replace(/\{\{nome_pensione\}\}/g, tenantName),
        html,
        attachments: [
          {
            filename: pdfFilename,
            content: pdf_base64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const finalSubject = (tenant?.preventivo_email_subject || `Richiesta dal {{data_checkin}} al {{data_checkout}}`)
      .replace(/\{\{data_checkin\}\}/g, checkInFormatted)
      .replace(/\{\{data_checkout\}\}/g, checkOutFormatted)
      .replace(/\{\{nome_cliente\}\}/g, client.first_name)
      .replace(/\{\{numero_preventivo\}\}/g, booking.booking_number)
      .replace(/\{\{nome_pensione\}\}/g, tenantName);

    await supabaseAdmin.from("email_logs").insert({
      tenant_id: booking.tenant_id,
      client_id: (booking as any).client_id ?? null,
      booking_id,
      direction: "sent",
      email_type: "preventivo",
      subject: finalSubject,
      recipient_email: client.email,
      status: "sent",
      body_html: html,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Preventivo inviato a ${client.email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
