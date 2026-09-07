import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stessa classificazione usata lato app (src/lib/documentTypes.ts): duplicata
// qui perché le edge function di questo progetto sono sempre autonome,
// senza import condivisi con il codice frontend.
const REQUIRED_DOCUMENT_TYPES = ["libretto_vaccinazioni", "modulo_affido"];
const PERSISTENT_DOCUMENT_TYPES = ["libretto_vaccinazioni", "documento_identita"];

const INACTIVE_STATUSES = ["preventivo", "scaduto", "cancellata", "rimborsata"];

function calcRemaining(totalAmount: number, payments: { amount: number; payment_type: string }[]) {
  const paid = payments
    .filter((p) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p) => p.payment_type === "rimborso")
    .reduce((s, p) => s + Number(p.amount), 0);
  return Math.max(0, totalAmount - (paid - refunded));
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    const siteUrl = Deno.env.get("SITE_URL") || "";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = toDateStr(tomorrow);
    const in3Days = new Date(today);
    in3Days.setUTCDate(in3Days.getUTCDate() + 3);
    const in3DaysStr = toDateStr(in3Days);

    const alreadySent = async (type: string, bookingId: string) => {
      const { data } = await supabaseAdmin
        .from("email_log")
        .select("id")
        .contains("metadata", { type, booking_id: bookingId })
        .limit(1);
      return (data?.length ?? 0) > 0;
    };

    const sendEmail = async (opts: {
      type: string; bookingId: string; tenantId: string; tenantName: string; to: string; subject: string; html: string;
    }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${opts.tenantName} <${fromEmail}>`, to: [opts.to], subject: opts.subject, html: opts.html }),
      });
      const result = await res.json().catch(() => null);
      await supabaseAdmin.from("email_log").insert({
        tenant_id: opts.tenantId,
        recipient_email: opts.to,
        subject: opts.subject,
        status: res.ok ? "sent" : "failed",
        provider_message_id: result?.id ?? null,
        sent_at: res.ok ? new Date().toISOString() : null,
        error_message: res.ok ? null : JSON.stringify(result),
        metadata: { type: opts.type, booking_id: opts.bookingId },
      });
      return res.ok;
    };

    const wrapHtml = (bodyHtml: string) =>
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">${bodyHtml}</div>`;

    // Solo le pensioni che hanno attivato questa automazione dal pannello
    // super admin (di default disattivata per tutte).
    const { data: enabledTenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("client_reminders_enabled", true);
    const enabledTenantIds = (enabledTenants ?? []).map((t) => t.id);

    if (enabledTenantIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, errors: [], skipped: "Nessuna pensione ha attivato i promemoria" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    const errors: string[] = [];

    // 1. Promemoria check-in domani
    {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("id, tenant_id, booking_number, check_in_date, client:clients(first_name, email), booking_cats(cats(name)), tenants(name)")
        .eq("check_in_date", tomorrowStr)
        .in("tenant_id", enabledTenantIds)
        .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

      for (const b of bookings ?? []) {
        const client = (b as any).client;
        const tenantName = (b as any).tenants?.name || "La Pensione";
        if (!client?.email) continue;
        if (await alreadySent("checkin_reminder", b.id)) continue;
        const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
        const subject = `${b.booking_number} - Ci vediamo domani!`;
        const html = wrapHtml(`
          <p>Ciao ${client.first_name || ""},</p>
          <p>Ti aspettiamo domani, ${formatDate(b.check_in_date)}, per il check-in${petNames ? ` di ${petNames}` : ""}.</p>
          <p>A presto,<br>${tenantName}</p>
        `);
        try {
          const ok = await sendEmail({ type: "checkin_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName, to: client.email, subject, html });
          if (ok) sent++;
        } catch (e: any) { errors.push(e.message); }
      }
    }

    // 2. Promemoria check-out domani
    {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("id, tenant_id, booking_number, check_out_date, client:clients(first_name, email), booking_cats(cats(name)), tenants(name)")
        .eq("check_out_date", tomorrowStr)
        .in("tenant_id", enabledTenantIds)
        .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

      for (const b of bookings ?? []) {
        const client = (b as any).client;
        const tenantName = (b as any).tenants?.name || "La Pensione";
        if (!client?.email) continue;
        if (await alreadySent("checkout_reminder", b.id)) continue;
        const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
        const subject = `${b.booking_number} - Il check-out è domani`;
        const html = wrapHtml(`
          <p>Ciao ${client.first_name || ""},</p>
          <p>Ti ricordiamo che domani, ${formatDate(b.check_out_date)}, è previsto il check-out${petNames ? ` di ${petNames}` : ""}.</p>
          <p>A presto,<br>${tenantName}</p>
        `);
        try {
          const ok = await sendEmail({ type: "checkout_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName, to: client.email, subject, html });
          if (ok) sent++;
        } catch (e: any) { errors.push(e.message); }
      }
    }

    // 3. Promemoria documenti mancanti (3 giorni prima del check-in)
    {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("id, tenant_id, client_id, booking_number, check_in_date, client:clients(first_name, email), tenants(name)")
        .eq("check_in_date", in3DaysStr)
        .in("tenant_id", enabledTenantIds)
        .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

      for (const b of bookings ?? []) {
        const client = (b as any).client;
        const tenantName = (b as any).tenants?.name || "La Pensione";
        if (!client?.email) continue;
        if (await alreadySent("documents_reminder", b.id)) continue;

        const { data: docs } = await supabaseAdmin
          .from("documents")
          .select("document_type, booking_id, client_id")
          .or(`booking_id.eq.${b.id},client_id.eq.${(b as any).client_id}`);

        const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => {
          if (PERSISTENT_DOCUMENT_TYPES.includes(type)) {
            return !(docs ?? []).some((d) => d.client_id === (b as any).client_id && d.document_type === type);
          }
          return !(docs ?? []).some((d) => d.booking_id === b.id && d.document_type === type);
        });
        if (missing.length === 0) continue;

        const labels: Record<string, string> = {
          libretto_vaccinazioni: "libretto vaccinazioni", modulo_affido: "modulo di affido",
        };
        const missingList = missing.map((t) => labels[t] ?? t).join(", ");
        const portalUrl = `${siteUrl}/cliente/preventivi`;
        const subject = `${b.booking_number} - Documenti da caricare prima dell'arrivo`;
        const html = wrapHtml(`
          <p>Ciao ${client.first_name || ""},</p>
          <p>Il check-in del ${formatDate(b.check_in_date)} si avvicina: mancano ancora questi documenti: <strong>${missingList}</strong>.</p>
          <p>Puoi caricarli (anche con una foto dal telefono) dalla tua <a href="${portalUrl}">area riservata</a>, oppure portarli con te il giorno dell'arrivo.</p>
          <p>A presto,<br>${tenantName}</p>
        `);
        try {
          const ok = await sendEmail({ type: "documents_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName, to: client.email, subject, html });
          if (ok) sent++;
        } catch (e: any) { errors.push(e.message); }
      }
    }

    // 4. Sollecito saldo scaduto
    {
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("id, tenant_id, booking_number, check_out_date, total_amount, client:clients(first_name, email), payments(amount, payment_type), tenants(name)")
        .lt("check_out_date", todayStr)
        .in("tenant_id", enabledTenantIds)
        .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

      for (const b of bookings ?? []) {
        const client = (b as any).client;
        const tenantName = (b as any).tenants?.name || "La Pensione";
        if (!client?.email) continue;
        const remaining = calcRemaining(Number(b.total_amount ?? 0), (b as any).payments ?? []);
        if (remaining <= 0) continue;
        if (await alreadySent("balance_reminder", b.id)) continue;

        const subject = `${b.booking_number} - Saldo da regolare`;
        const html = wrapHtml(`
          <p>Ciao ${client.first_name || ""},</p>
          <p>Risulta ancora un saldo di <strong>€ ${remaining.toFixed(2)}</strong> da regolare per il soggiorno concluso il ${formatDate(b.check_out_date)}.</p>
          <p>Contattaci per sistemarlo appena possibile.</p>
          <p>Grazie,<br>${tenantName}</p>
        `);
        try {
          const ok = await sendEmail({ type: "balance_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName, to: client.email, subject, html });
          if (ok) sent++;
        } catch (e: any) { errors.push(e.message); }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
