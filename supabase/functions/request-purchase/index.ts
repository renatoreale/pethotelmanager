import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PetHotelManager <${fromEmail}>`,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      nome, cognome, email, telefono,
      nome_pensione, citta_pensione, partita_iva,
      piano, price_id,
    } = await req.json();

    if (!nome || !cognome || !email || !nome_pensione || !citta_pensione || !partita_iva || !piano || !price_id) {
      return new Response(JSON.stringify({ error: "Campi obbligatori mancanti" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Inserisce la richiesta in stato pending
    const { data: purchaseRequest, error: insertError } = await supabaseAdmin
      .from("purchase_requests")
      .insert({
        nome, cognome, email,
        telefono: telefono || null,
        nome_pensione, citta_pensione, partita_iva,
        piano, price_id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw new Error("Errore DB: " + insertError.message);

    // 2. Crea sessione Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const origin = req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/acquisto-completato?session_id={CHECKOUT_SESSION_ID}&request_id=${purchaseRequest.id}`,
      cancel_url: `${origin}/landing?acquisto=cancellato`,
      metadata: {
        purchase_request_id: purchaseRequest.id,
      },
    });

    // Salva session id sulla richiesta
    await supabaseAdmin
      .from("purchase_requests")
      .update({ stripe_session_id: session.id })
      .eq("id", purchaseRequest.id);

    // 3. Email all'admin
    const pianoLabel = piano.charAt(0).toUpperCase() + piano.slice(1);
    const NOTIFICATION_ORDERS_EMAIL = Deno.env.get("NOTIFICATION_ORDERS_EMAIL");
    if (NOTIFICATION_ORDERS_EMAIL) {
      const adminHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#c45a12;margin:0 0 20px;">Nuova Richiesta di Acquisto — Piano ${pianoLabel}</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;width:160px;">Nome</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${nome} ${cognome}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${email}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Telefono</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${telefono || "—"}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Nome Pensione</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${nome_pensione}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Città</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${citta_pensione}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">P.IVA / Codice Fiscale</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${partita_iva}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Piano Selezionato</td><td style="padding:8px 12px;border-bottom:1px solid #eee;"><strong>${pianoLabel}</strong></td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Stato</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#f59e0b;">In attesa di pagamento</td></tr>
          </table>
          <p style="margin-top:20px;font-size:13px;color:#666;">
            Il cliente è stato reindirizzato alla pagina di pagamento Stripe.<br/>
            Lo stato verrà aggiornato automaticamente a <em>pagato</em> al completamento.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;">PetHotelManager — Notifica automatica</p>
        </div>
      `;
      await sendEmail(
        NOTIFICATION_ORDERS_EMAIL,
        `[Acquisto Pendente] ${nome} ${cognome} — Piano ${pianoLabel}`,
        adminHtml,
      );
    }

    // 4. Email di conferma al cliente
    const customerHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
        <p>Ciao <strong>${nome}</strong>,</p>
        <p>Abbiamo ricevuto la tua richiesta di acquisto per il piano <strong>${pianoLabel}</strong>.</p>
        <p>Stai per essere reindirizzato alla pagina di pagamento sicura Stripe.<br/>
        Una volta completato il pagamento, riceverai una conferma e il tuo account verrà attivato.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin:24px 0;font-size:14px;">
          <p style="margin:0 0 8px;font-weight:600;color:#333;">Riepilogo richiesta</p>
          <ul style="margin:0;padding-left:20px;color:#555;line-height:1.8;">
            <li>Pensione: <strong>${nome_pensione}</strong></li>
            <li>Città: <strong>${citta_pensione}</strong></li>
            <li>Piano: <strong>${pianoLabel}</strong></li>
          </ul>
        </div>
        <p style="color:#555;font-size:14px;">
          Per qualsiasi domanda puoi rispondere a questa email o contattarci direttamente.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
      </div>
    `;
    await sendEmail(
      email,
      `Richiesta di acquisto Piano ${pianoLabel} — PetHotelManager`,
      customerHtml,
    );

    return new Response(JSON.stringify({ success: true, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("request-purchase error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
