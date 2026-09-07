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

// Template predefiniti: stesso pattern già in uso per preventivo_email_body
// / appuntamento_email_body — testo semplice con placeholder {{var}}, usato
// solo se il titolare non ha personalizzato il template dal pannello
// Impostazioni Pensione > Template Email > Automazioni.
const DEFAULT_TEMPLATES = {
  upcoming_stay: {
    subject: "{{numero_prenotazione}} - Ci vediamo tra una settimana!",
    body: "Ciao {{nome_cliente}},\n\nManca una settimana al soggiorno di {{pet_nomi}}, in arrivo il {{data_checkin}}.\n\nA presto,\n{{nome_pensione}}",
  },
  documents: {
    subject: "{{numero_prenotazione}} - Documenti da caricare prima dell'arrivo",
    body: "Ciao {{nome_cliente}},\n\nIl check-in del {{data_checkin}} si avvicina: mancano ancora questi documenti: {{documenti_mancanti}}.\n\nPuoi caricarli (anche con una foto dal telefono) dalla tua area riservata ({{link_area_riservata}}), oppure portarli con te il giorno dell'arrivo.\n\nA presto,\n{{nome_pensione}}",
  },
  checkin: {
    subject: "{{numero_prenotazione}} - Ci vediamo domani!",
    body: "Ciao {{nome_cliente}},\n\nTi aspettiamo domani, {{data_checkin}}, per il check-in di {{pet_nomi}} (orario: {{orario_checkin}}).\n\nA presto,\n{{nome_pensione}}",
  },
  checkout: {
    subject: "{{numero_prenotazione}} - Il check-out è domani",
    body: "Ciao {{nome_cliente}},\n\nTi ricordiamo che domani, {{data_checkout}}, è previsto il check-out di {{pet_nomi}} (orario: {{orario_checkout}}).\n\nA presto,\n{{nome_pensione}}",
  },
  checkout_summary: {
    subject: "{{numero_prenotazione}} - Riepilogo del soggiorno",
    body: "Ciao {{nome_cliente}},\n\nIl soggiorno di {{pet_nomi}} si conclude oggi, {{data_checkout}}.\n\nDal {{data_checkin}} al {{data_checkout}} — totale € {{totale}}.\n\n{{riga_saldo}}\n\nGrazie per averci scelto,\n{{nome_pensione}}",
  },
  balance: {
    subject: "{{numero_prenotazione}} - Saldo da regolare",
    body: "Ciao {{nome_cliente}},\n\nRisulta ancora un saldo di € {{saldo}} da regolare per il soggiorno concluso il {{data_checkout}}.\n\nContattaci per sistemarlo appena possibile.\n\nGrazie,\n{{nome_pensione}}",
  },
  review_request: {
    subject: "Com'è andato il soggiorno da {{nome_pensione}}?",
    body: "Ciao {{nome_cliente}},\n\nGrazie per aver scelto {{nome_pensione}}! Se ti va, raccontaci com'è andata con una recensione:\n{{link_recensione}}\n\nGrazie,\n{{nome_pensione}}",
  },
  winback: {
    subject: "{{pet_nomi}} ci manca!",
    body: "Ciao {{nome_cliente}},\n\nSono passati {{giorni}} giorni dall'ultimo soggiorno di {{pet_nomi}}. Se stai organizzando una prossima trasferta, siamo qui!\n\nA presto,\n{{nome_pensione}}",
  },
} as const;

function renderTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

function toHtml(rawBody: string) {
  return rawBody
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`))
    .join("");
}

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

// Orario dell'appuntamento fissato dal cliente (appointments.scheduled_at,
// stesso formato "YYYY-MM-DDTHH:MM:SS" usato in ClienteBookingDetailDialog).
// Se non è ancora stato fissato un orario, si segnala esplicitamente invece
// di lasciare un buco nel testo.
function extractTime(scheduledAt: string) {
  const tIndex = scheduledAt.indexOf("T");
  return tIndex >= 0 ? scheduledAt.slice(tIndex + 1, tIndex + 6) : null;
}

interface TenantAutomations {
  id: string;
  name: string;
  review_url: string | null;
  automation_upcoming_stay_reminder_enabled: boolean;
  automation_documents_reminder_enabled: boolean;
  automation_checkin_reminder_enabled: boolean;
  automation_checkout_reminder_enabled: boolean;
  automation_checkout_summary_enabled: boolean;
  automation_balance_reminder_enabled: boolean;
  automation_review_request_enabled: boolean;
  automation_winback_enabled: boolean;
  automation_upcoming_stay_subject: string | null;
  automation_upcoming_stay_body: string | null;
  automation_documents_subject: string | null;
  automation_documents_body: string | null;
  automation_checkin_subject: string | null;
  automation_checkin_body: string | null;
  automation_checkout_subject: string | null;
  automation_checkout_body: string | null;
  automation_checkout_summary_subject: string | null;
  automation_checkout_summary_body: string | null;
  automation_balance_subject: string | null;
  automation_balance_body: string | null;
  automation_review_request_subject: string | null;
  automation_review_request_body: string | null;
  automation_winback_subject: string | null;
  automation_winback_body: string | null;
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
    const dayOffset = (n: number) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + n);
      return toDateStr(d);
    };
    const todayStr = dayOffset(0);
    const tomorrowStr = dayOffset(1);
    const in3DaysStr = dayOffset(3);
    const in7DaysStr = dayOffset(7);
    const yesterdayStr = dayOffset(-1);
    const days30AgoStr = dayOffset(-30);
    const days60AgoStr = dayOffset(-60);
    const days90AgoStr = dayOffset(-90);

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

    const renderEmail = (
      tenant: TenantAutomations,
      key: keyof typeof DEFAULT_TEMPLATES,
      subjectCol: keyof TenantAutomations,
      bodyCol: keyof TenantAutomations,
      vars: Record<string, string>,
    ) => {
      const defaults = DEFAULT_TEMPLATES[key];
      const subject = renderTemplate((tenant[subjectCol] as string | null) || defaults.subject, vars);
      const html = wrapHtml(toHtml(renderTemplate((tenant[bodyCol] as string | null) || defaults.body, vars)));
      return { subject, html };
    };

    // Interruttore master per pensione (pannello super admin, default OFF
    // per tutte): se spento, nessuna automazione parte per quel tenant,
    // indipendentemente dalle singole automazioni attivate dal titolare.
    const { data: tenantsData } = await supabaseAdmin
      .from("tenants")
      .select(
        "id, name, review_url, automation_upcoming_stay_reminder_enabled, automation_documents_reminder_enabled, " +
        "automation_checkin_reminder_enabled, automation_checkout_reminder_enabled, automation_checkout_summary_enabled, " +
        "automation_balance_reminder_enabled, automation_review_request_enabled, automation_winback_enabled, " +
        "automation_upcoming_stay_subject, automation_upcoming_stay_body, automation_documents_subject, automation_documents_body, " +
        "automation_checkin_subject, automation_checkin_body, automation_checkout_subject, automation_checkout_body, " +
        "automation_checkout_summary_subject, automation_checkout_summary_body, automation_balance_subject, automation_balance_body, " +
        "automation_review_request_subject, automation_review_request_body, automation_winback_subject, automation_winback_body"
      )
      .eq("client_reminders_enabled", true);
    const tenants = (tenantsData ?? []) as TenantAutomations[];

    if (tenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, errors: [], skipped: "Nessuna pensione ha attivato i promemoria" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const idsWhere = (key: keyof TenantAutomations) => tenants.filter((t) => t[key]).map((t) => t.id);

    let sent = 0;
    const errors: string[] = [];

    // 1. Promemoria soggiorno in arrivo (7 giorni prima)
    {
      const tenantIds = idsWhere("automation_upcoming_stay_reminder_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_in_date, client:clients(first_name, email), booking_cats(cats(name))")
          .eq("check_in_date", in7DaysStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email) continue;
          if (await alreadySent("upcoming_stay_reminder", b.id)) continue;
          const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
          const { subject, html } = renderEmail(tenant, "upcoming_stay", "automation_upcoming_stay_subject", "automation_upcoming_stay_body", {
            nome_cliente: client.first_name || "", pet_nomi: petNames || "il tuo pet",
            data_checkin: formatDate(b.check_in_date), numero_prenotazione: b.booking_number, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "upcoming_stay_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 2. Promemoria check-in domani
    {
      const tenantIds = idsWhere("automation_checkin_reminder_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_in_date, client:clients(first_name, email), booking_cats(cats(name)), appointments(appointment_type, scheduled_at)")
          .eq("check_in_date", tomorrowStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email) continue;
          if (await alreadySent("checkin_reminder", b.id)) continue;
          const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
          const checkinAppt = ((b as any).appointments ?? []).find((a: any) => a.appointment_type === "check_in");
          const orarioCheckin = checkinAppt ? extractTime(checkinAppt.scheduled_at) : null;
          const { subject, html } = renderEmail(tenant, "checkin", "automation_checkin_subject", "automation_checkin_body", {
            nome_cliente: client.first_name || "", pet_nomi: petNames || "il tuo pet",
            data_checkin: formatDate(b.check_in_date), orario_checkin: orarioCheckin || "da confermare",
            numero_prenotazione: b.booking_number, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "checkin_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 3. Promemoria check-out domani
    {
      const tenantIds = idsWhere("automation_checkout_reminder_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_out_date, client:clients(first_name, email), booking_cats(cats(name)), appointments(appointment_type, scheduled_at)")
          .eq("check_out_date", tomorrowStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email) continue;
          if (await alreadySent("checkout_reminder", b.id)) continue;
          const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
          const checkoutAppt = ((b as any).appointments ?? []).find((a: any) => a.appointment_type === "check_out");
          const orarioCheckout = checkoutAppt ? extractTime(checkoutAppt.scheduled_at) : null;
          const { subject, html } = renderEmail(tenant, "checkout", "automation_checkout_subject", "automation_checkout_body", {
            nome_cliente: client.first_name || "", pet_nomi: petNames || "il tuo pet",
            data_checkout: formatDate(b.check_out_date), orario_checkout: orarioCheckout || "da confermare",
            numero_prenotazione: b.booking_number, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "checkout_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 4. Promemoria documenti mancanti (3 giorni prima del check-in)
    {
      const tenantIds = idsWhere("automation_documents_reminder_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, client_id, booking_number, check_in_date, client:clients(first_name, email)")
          .eq("check_in_date", in3DaysStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
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
          const { subject, html } = renderEmail(tenant, "documents", "automation_documents_subject", "automation_documents_body", {
            nome_cliente: client.first_name || "", data_checkin: formatDate(b.check_in_date), documenti_mancanti: missingList,
            numero_prenotazione: b.booking_number, link_area_riservata: portalUrl, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "documents_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 5. Check-out: riepilogo soggiorno e saldo (il giorno stesso del check-out)
    {
      const tenantIds = idsWhere("automation_checkout_summary_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_in_date, check_out_date, total_amount, client:clients(first_name, email), payments(amount, payment_type), booking_cats(cats(name))")
          .eq("check_out_date", todayStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email) continue;
          if (await alreadySent("checkout_summary", b.id)) continue;
          const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
          const remaining = calcRemaining(Number(b.total_amount ?? 0), (b as any).payments ?? []);
          const rigaSaldo = remaining > 0
            ? `Saldo residuo: € ${remaining.toFixed(2)}.`
            : "Nessun saldo residuo, grazie!";
          const { subject, html } = renderEmail(tenant, "checkout_summary", "automation_checkout_summary_subject", "automation_checkout_summary_body", {
            nome_cliente: client.first_name || "", pet_nomi: petNames || "il tuo pet",
            data_checkin: formatDate(b.check_in_date), data_checkout: formatDate(b.check_out_date),
            totale: Number(b.total_amount ?? 0).toFixed(2), riga_saldo: rigaSaldo,
            numero_prenotazione: b.booking_number, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "checkout_summary", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 6. Sollecito saldo scaduto
    {
      const tenantIds = idsWhere("automation_balance_reminder_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_out_date, total_amount, client:clients(first_name, email), payments(amount, payment_type)")
          .lt("check_out_date", todayStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email) continue;
          const remaining = calcRemaining(Number(b.total_amount ?? 0), (b as any).payments ?? []);
          if (remaining <= 0) continue;
          if (await alreadySent("balance_reminder", b.id)) continue;

          const { subject, html } = renderEmail(tenant, "balance", "automation_balance_subject", "automation_balance_body", {
            nome_cliente: client.first_name || "", saldo: remaining.toFixed(2),
            data_checkout: formatDate(b.check_out_date), numero_prenotazione: b.booking_number, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "balance_reminder", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 7. Richiesta recensione (1 giorno dopo il check-out, solo se configurato un link)
    {
      const tenantIds = idsWhere("automation_review_request_enabled");
      if (tenantIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, tenant_id, booking_number, check_out_date, client:clients(first_name, email)")
          .eq("check_out_date", yesterdayStr)
          .in("tenant_id", tenantIds)
          .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

        for (const b of bookings ?? []) {
          const client = (b as any).client;
          const tenant = tenantById.get(b.tenant_id)!;
          if (!client?.email || !tenant.review_url) continue;
          if (await alreadySent("review_request", b.id)) continue;
          const { subject, html } = renderEmail(tenant, "review_request", "automation_review_request_subject", "automation_review_request_body", {
            nome_cliente: client.first_name || "", link_recensione: tenant.review_url, nome_pensione: tenant.name,
          });
          try {
            const ok = await sendEmail({ type: "review_request", bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
            if (ok) sent++;
          } catch (e: any) { errors.push(e.message); }
        }
      }
    }

    // 8. Invito a tornare (30/60/90 giorni dopo il check-out)
    {
      const tenantIds = idsWhere("automation_winback_enabled");
      if (tenantIds.length > 0) {
        for (const { days, dateStr } of [
          { days: 30, dateStr: days30AgoStr },
          { days: 60, dateStr: days60AgoStr },
          { days: 90, dateStr: days90AgoStr },
        ]) {
          const { data: bookings } = await supabaseAdmin
            .from("bookings")
            .select("id, tenant_id, booking_number, client:clients(first_name, email), booking_cats(cats(name))")
            .eq("check_out_date", dateStr)
            .in("tenant_id", tenantIds)
            .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`);

          const type = `winback_${days}`;
          for (const b of bookings ?? []) {
            const client = (b as any).client;
            const tenant = tenantById.get(b.tenant_id)!;
            if (!client?.email) continue;
            if (await alreadySent(type, b.id)) continue;
            const petNames = ((b as any).booking_cats ?? []).map((bc: any) => bc.cats?.name).filter(Boolean).join(", ");
            const { subject, html } = renderEmail(tenant, "winback", "automation_winback_subject", "automation_winback_body", {
              nome_cliente: client.first_name || "", pet_nomi: petNames || "il tuo pet",
              giorni: String(days), nome_pensione: tenant.name,
            });
            try {
              const ok = await sendEmail({ type, bookingId: b.id, tenantId: b.tenant_id, tenantName: tenant.name, to: client.email, subject, html });
              if (ok) sent++;
            } catch (e: any) { errors.push(e.message); }
          }
        }
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
