import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPLY_TO = "orders@pethotelmanager.com";

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<string | null> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_ORDERS_EMAIL") || "noreply@pethotelmanager.com";
  if (!resendKey) {
    const msg = "RESEND_API_KEY non configurata";
    console.error(msg);
    return msg;
  }
  const body: Record<string, unknown> = {
    from: `PetHotelManager <${fromEmail}>`,
    to: [to],
    subject,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return err;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(
        JSON.stringify({ success: false, payment_status: session.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Aggiorna status e recupera i dati della richiesta
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("purchase_requests")
      .update({ status: "pagato" })
      .eq("stripe_session_id", session_id)
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      // Potrebbe essere già stato aggiornato (doppio click) — recupera comunque i dati
      console.error("DB update error:", updateError.message);
    }

    // Se l'update non ha restituito dati (già pagato), recupera comunque per le email
    let purchase = updated;
    if (!purchase) {
      const { data: existing } = await supabaseAdmin
        .from("purchase_requests")
        .select()
        .eq("stripe_session_id", session_id)
        .single();
      purchase = existing;
    }

    // Invia le email solo se abbiamo i dati e il pagamento non era già confermato
    if (purchase && updated) {
      const pianoLabel = purchase.piano.charAt(0).toUpperCase() + purchase.piano.slice(1);

      const importoPagato = (session.amount_total ?? 0) / 100;
      const prezzoLabel = `€${importoPagato.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/anno`;

      // ── Email all'admin ──
      let adminErr: string | null = null;
      const NOTIFICATION_ORDERS_EMAIL = Deno.env.get("NOTIFICATION_ORDERS_EMAIL");
      if (NOTIFICATION_ORDERS_EMAIL) {
        const adminHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#c45a12;margin:0 0 20px;">✅ Acquisto Completato — Piano ${pianoLabel}</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;width:160px;">Nome</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.nome} ${purchase.cognome}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.email}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Telefono</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.telefono || "—"}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Nome Pensione</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.nome_pensione}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Città</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.citta_pensione}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">P.IVA / CF</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${purchase.partita_iva}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Piano</td><td style="padding:8px 12px;border-bottom:1px solid #eee;"><strong>${pianoLabel}</strong> — ${prezzoLabel}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Stato</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#16a34a;font-weight:600;">✅ Pagato</td></tr>
            </table>
            <p style="margin-top:20px;font-size:13px;color:#666;">
              Il cliente ha completato il pagamento tramite Stripe.<br/>
              Procedi con l'attivazione dell'account.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
            <p style="color:#999;font-size:12px;">PetHotelManager — Notifica automatica</p>
          </div>
        `;
        adminErr = await sendEmail(
          NOTIFICATION_ORDERS_EMAIL,
          `[Acquisto Completato] ${purchase.nome} ${purchase.cognome} — Piano ${pianoLabel}`,
          adminHtml,
        );
        if (adminErr) console.error("Admin email failed:", adminErr);
      }

      // ── Email al cliente ──
      const customerHtml = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
          <p>Ciao <strong>${purchase.nome}</strong>,</p>
          <p>
            Il tuo acquisto è andato a buon fine! 🎉<br/>
            Grazie per aver scelto <strong>PetHotelManager Piano ${pianoLabel}</strong>.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:24px 0;font-size:14px;">
            <p style="margin:0 0 10px;font-weight:600;color:#15803d;">Riepilogo acquisto</p>
            <ul style="margin:0;padding-left:20px;color:#555;line-height:2;">
              <li>Piano: <strong>${pianoLabel}</strong></li>
              <li>Pensione: <strong>${purchase.nome_pensione}</strong></li>
              <li>Città: <strong>${purchase.citta_pensione}</strong></li>
              <li>Importo: <strong>${prezzoLabel}</strong></li>
            </ul>
          </div>
          <p style="color:#555;font-size:14px;">
            Il nostro team ti contatterà nelle prossime ore per attivare il tuo account
            e guidarti nella configurazione iniziale.
          </p>
          <p style="color:#555;font-size:14px;">
            Per qualsiasi domanda puoi risponderci direttamente a questa email oppure
            scrivere a <a href="mailto:${REPLY_TO}" style="color:#c45a12;">${REPLY_TO}</a>.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
        </div>
      `;
      const customerErr = await sendEmail(
        purchase.email,
        `Conferma acquisto Piano ${pianoLabel} — PetHotelManager`,
        customerHtml,
        REPLY_TO,
      );
      if (customerErr) console.error("Customer email failed:", customerErr);

      const emailStatus = {
        admin: !NOTIFICATION_ORDERS_EMAIL ? "skipped" : adminErr ?? "ok",
        customer: customerErr ?? "ok",
      };
      return new Response(JSON.stringify({ success: true, email_status: emailStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true, email_status: "already_paid" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("verify-purchase error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
