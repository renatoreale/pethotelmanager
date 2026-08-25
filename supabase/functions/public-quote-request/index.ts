import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";
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
    console.error("Resend error:", await res.text());
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      pensione_slug, nome, cognome, email, telefono,
      check_in_date, check_out_date, num_pets, pet_names, notes,
    } = await req.json();

    if (!pensione_slug || !nome || !cognome || !email || !check_in_date || !check_out_date) {
      return new Response(JSON.stringify({ error: "Campi obbligatori mancanti" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      return new Response(JSON.stringify({ error: "Date non valide: il check-out deve essere successivo al check-in" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Risolve il tenant dallo slug pubblico
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, email")
      .eq("slug", pensione_slug)
      .is("deleted_at", null)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Pensione non trovata" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Trova o crea il cliente per questo tenant (match per email)
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("tenant_id", tenant.id)
      .ilike("email", email)
      .maybeSingle();

    let clientId = existingClient?.id as string | undefined;
    if (!clientId) {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from("clients")
        .insert({
          tenant_id: tenant.id,
          first_name: nome,
          last_name: cognome,
          email,
          phone: telefono || null,
        })
        .select("id")
        .single();
      if (clientError) throw new Error("Errore nella creazione del cliente: " + clientError.message);
      clientId = newClient.id;
    }

    // 3. Crea la richiesta di preventivo
    const { error: quoteError } = await supabaseAdmin
      .from("quote_requests")
      .insert({
        tenant_id: tenant.id,
        client_id: clientId,
        check_in_date,
        check_out_date,
        num_pets: num_pets && num_pets > 0 ? num_pets : 1,
        pet_names: pet_names || null,
        notes: notes || null,
        status: "pending",
      });
    if (quoteError) throw new Error("Errore nella creazione della richiesta: " + quoteError.message);

    // 4. Notifica alla pensione, se ha un'email configurata
    if (tenant.email) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#c45a12;margin:0 0 20px;">Nuova richiesta di preventivo</h2>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;width:140px;">Cliente</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${nome} ${cognome}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${email}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Telefono</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${telefono || "—"}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Check-in</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${check_in_date}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Check-out</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${check_out_date}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">N. pet</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${num_pets || 1}</td></tr>
            ${pet_names ? `<tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Nomi pet</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${pet_names}</td></tr>` : ""}
            ${notes ? `<tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;">Note</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${notes}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;font-size:13px;color:#666;">Richiesta ricevuta dal form pubblico di preventivo. Accedi al gestionale, sezione Preventivi, per gestirla.</p>
        </div>
      `;
      await sendEmail(tenant.email, `Nuova richiesta di preventivo — ${nome} ${cognome}`, html);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("public-quote-request error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
