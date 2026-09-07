import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .select("name")
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

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <p style="margin:0 0 16px">Ciao ${client.first_name || ""},</p>
        <p style="margin:0 0 16px">${tenantName} ha pubblicato un nuovo aggiornamento su ${cat?.name || "il tuo pet"}:</p>
        ${photoHtml}
        ${noteHtml}
        <p style="margin:16px 0 0;font-size:14px;color:#555">
          Se vuoi scaricare la foto in alta risoluzione, puoi farlo dalla tua
          <a href="${portalUrl}">area riservata</a>.
        </p>
      </div>
    `;

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
