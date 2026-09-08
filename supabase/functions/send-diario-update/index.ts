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

    const { diario_entry_id } = await req.json();
    if (!diario_entry_id) throw new Error("diario_entry_id richiesto");

    const { data: entry, error: entryErr } = await supabaseAdmin
      .from("diario_entries")
      .select(`
        id, tenant_id, note, photo_path, created_at, booking_id,
        cat:cats(name, client:clients(first_name, email)),
        booking:bookings(booking_number)
      `)
      .eq("id", diario_entry_id)
      .single();
    if (entryErr || !entry) throw new Error("Voce di diario non trovata");

    // Una voce non legata a un soggiorno non ha un numero di prenotazione da
    // mettere nell'oggetto: per queste non inviamo l'email (richiesto dal
    // formato oggetto "numero prenotazione - aggiornamento del ...").
    const booking = entry.booking as any;
    if (!booking?.booking_number) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Voce non collegata a una prenotazione" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cat = entry.cat as any;
    const client = cat?.client;
    if (!client?.email) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Il cliente non ha un indirizzo email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, logo_url, address, city, cap, phone, email, social_facebook_url, social_instagram_url, social_tiktok_url, social_whatsapp_url")
      .eq("id", entry.tenant_id)
      .single();
    const tenantName = tenant?.name || "La Pensione";

    const entryDate = new Date(entry.created_at);
    const formattedDate = `${String(entryDate.getUTCDate()).padStart(2, "0")}/${String(entryDate.getUTCMonth() + 1).padStart(2, "0")}/${entryDate.getUTCFullYear()}`;

    const subject = `${booking.booking_number} - Aggiornamento del ${formattedDate}`;

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    const portalUrl = `${origin}/cliente/diario`;

    let photoHtml = "";
    if (entry.photo_path) {
      const { data: urlData } = supabaseAdmin.storage.from("diario-photos").getPublicUrl(entry.photo_path);
      photoHtml = `<img src="${urlData.publicUrl}" alt="Aggiornamento" style="max-width:240px;border-radius:8px;margin-bottom:16px;display:block;" />`;
    }

    const noteHtml = (entry.note || "")
      .split("\n")
      .map((line: string) => line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`)
      .join("");

    const html = emailShell({ ...(tenant as any), name: tenantName }, `
      <p style="margin:0 0 16px">Ciao ${client.first_name || ""},</p>
      <p style="margin:0 0 16px">${tenantName} ha pubblicato un nuovo aggiornamento su ${cat?.name || "il tuo pet"}:</p>
      ${photoHtml}
      ${noteHtml}
      <p style="margin:16px 0 0;font-size:14px;color:#555">
        Se vuoi scaricare la foto in alta risoluzione, puoi farlo dalla tua
        <a href="${portalUrl}">area riservata</a>.
      </p>
    `);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${tenantName} <${fromEmail}>`,
        to: [client.email],
        subject,
        html,
      }),
    });

    const resendResult = await res.json().catch(() => null);

    await supabaseAdmin.from("email_log").insert({
      tenant_id: entry.tenant_id,
      recipient_email: client.email,
      subject,
      status: res.ok ? "sent" : "failed",
      provider_message_id: resendResult?.id ?? null,
      sent_at: res.ok ? new Date().toISOString() : null,
      error_message: res.ok ? null : JSON.stringify(resendResult),
      metadata: { type: "diario_update", diario_entry_id, booking_id: entry.booking_id },
      created_by: caller.id,
    });

    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(resendResult)}`);

    return new Response(
      JSON.stringify({ success: true, message: `Email inviata a ${client.email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
