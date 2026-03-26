import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_EMAIL = "support@pethotelmanager.com";

const STATUS_LABELS: Record<string, string> = {
  aperto: "Aperto",
  in_lavorazione: "In lavorazione",
  risolto: "Risolto",
  chiuso: "Chiuso",
};

const PRIORITY_LABELS: Record<string, string> = {
  bassa: "Bassa",
  normale: "Normale",
  alta: "Alta",
  urgente: "Urgente",
};

const CATEGORY_LABELS: Record<string, string> = {
  tecnico: "Tecnico",
  fatturazione: "Fatturazione",
  configurazione: "Configurazione",
  altro: "Altro",
};

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_ORDERS_EMAIL") || "noreply@pethotelmanager.com";
  if (!resendKey) {
    console.error("RESEND_API_KEY non configurata");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PetHotelManager Supporto <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#f9f5f0;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}
  .header{background:#c2440e;padding:24px 32px;color:#fff}
  .header h1{margin:0;font-size:20px}
  .content{padding:28px 32px;color:#374151;line-height:1.6}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:12px}
  .info{background:#f3f4f6;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:14px}
  .info p{margin:4px 0}
  .footer{padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}
</style></head>
<body>
  <div class="wrap">
    <div class="header"><h1>🐾 PetHotelManager — Supporto</h1></div>
    <div class="content">
      <h2 style="margin-top:0">${title}</h2>
      ${body}
    </div>
    <div class="footer">PetHotelManager · support@pethotelmanager.com</div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, ticket_id, message_body, new_status, is_support_reply } = await req.json();

    if (!event || !ticket_id) {
      return new Response(JSON.stringify({ error: "event e ticket_id obbligatori" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Load ticket with tenant name and creator email
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select(`
        *,
        profiles!created_by ( full_name ),
        tenants!tenant_id ( name )
      `)
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket non trovato" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creator email from auth.users via admin API
    const { data: userData } = await supabase.auth.admin.getUserById(ticket.created_by);
    const userEmail = userData?.user?.email;
    const userName = (ticket.profiles as any)?.full_name ?? "Cliente";
    const tenantName = (ticket.tenants as any)?.name ?? "—";

    const infoBlock = `
      <div class="info">
        <p><strong>Pensione:</strong> ${tenantName}</p>
        <p><strong>Ticket #:</strong> ${ticket_id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Titolo:</strong> ${ticket.title}</p>
        <p><strong>Categoria:</strong> ${CATEGORY_LABELS[ticket.category] ?? ticket.category}</p>
        <p><strong>Priorità:</strong> ${PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</p>
        <p><strong>Stato:</strong> ${STATUS_LABELS[ticket.status] ?? ticket.status}</p>
      </div>`;

    // ── evento: ticket creato ─────────────────────────────────────────────────
    if (event === "created") {
      // Email all'utente
      if (userEmail) {
        await sendEmail(
          userEmail,
          `[Ticket aperto] ${ticket.title}`,
          baseTemplate(
            "Il tuo ticket è stato aperto",
            `<p>Ciao <strong>${userName}</strong>,</p>
            <p>Abbiamo ricevuto la tua richiesta di supporto. Ti risponderemo il prima possibile.</p>
            ${infoBlock}
            ${message_body ? `<p><strong>Messaggio:</strong></p><p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:14px">${message_body}</p>` : ""}`,
          ),
        );
      }

      // Email al supporto
      await sendEmail(
        SUPPORT_EMAIL,
        `[Nuovo ticket] ${ticket.title} — ${tenantName}`,
        baseTemplate(
          "Nuovo ticket di supporto",
          `<p>È stato aperto un nuovo ticket da <strong>${userName}</strong> (${userEmail ?? "—"}).</p>
          ${infoBlock}
          ${message_body ? `<p><strong>Messaggio:</strong></p><p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:14px">${message_body}</p>` : ""}`,
        ),
      );
    }

    // ── evento: nuovo messaggio ───────────────────────────────────────────────
    else if (event === "message") {
      if (is_support_reply) {
        // Messaggio del supporto → notifica l'utente
        if (userEmail) {
          await sendEmail(
            userEmail,
            `[Risposta supporto] ${ticket.title}`,
            baseTemplate(
              "Il supporto ha risposto al tuo ticket",
              `<p>Ciao <strong>${userName}</strong>,</p>
              <p>Il team di supporto di PetHotelManager ha risposto al tuo ticket.</p>
              ${infoBlock}
              ${message_body ? `<p><strong>Risposta:</strong></p><p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:14px">${message_body}</p>` : ""}`,
            ),
          );
        }
      } else {
        // Messaggio dell'utente → notifica il supporto
        await sendEmail(
          SUPPORT_EMAIL,
          `[Nuovo messaggio] ${ticket.title} — ${tenantName}`,
          baseTemplate(
            "Nuovo messaggio su un ticket",
            `<p><strong>${userName}</strong> (${userEmail ?? "—"}) ha aggiunto un messaggio.</p>
            ${infoBlock}
            ${message_body ? `<p><strong>Messaggio:</strong></p><p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:14px">${message_body}</p>` : ""}`,
          ),
        );
      }
    }

    // ── evento: cambio stato ──────────────────────────────────────────────────
    else if (event === "status_changed") {
      const statusLabel = STATUS_LABELS[new_status] ?? new_status;

      // Email all'utente
      if (userEmail) {
        await sendEmail(
          userEmail,
          `[Ticket aggiornato] ${ticket.title} → ${statusLabel}`,
          baseTemplate(
            `Stato ticket aggiornato: ${statusLabel}`,
            `<p>Ciao <strong>${userName}</strong>,</p>
            <p>Lo stato del tuo ticket è stato aggiornato a <strong>${statusLabel}</strong>.</p>
            ${infoBlock}`,
          ),
        );
      }

      // Email al supporto
      await sendEmail(
        SUPPORT_EMAIL,
        `[Stato cambiato] ${ticket.title} → ${statusLabel} — ${tenantName}`,
        baseTemplate(
          `Ticket aggiornato: ${statusLabel}`,
          `<p>Lo stato del ticket di <strong>${userName}</strong> è stato cambiato in <strong>${statusLabel}</strong>.</p>
          ${infoBlock}`,
        ),
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-ticket error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
