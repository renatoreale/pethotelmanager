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

    const { booking_id, pdf_base64, filename } = await req.json();
    if (!booking_id || !pdf_base64) throw new Error("booking_id e pdf_base64 richiesti");

    // Fetch booking with client, tenant and appointments
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select(`
        booking_number, tenant_id, check_in_date, check_out_date, client_id,
        client:clients(first_name, last_name, email),
        appointments(appointment_type, scheduled_at)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) throw new Error("Prenotazione non trovata");
    const client = booking.client as any;
    if (!client?.email) throw new Error("Il cliente non ha un indirizzo email");

    // Fetch tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, appuntamento_email_body, appuntamento_email_subject")
      .eq("id", booking.tenant_id)
      .single();
    const tenantName = tenant?.name || "La Pensione";

    // Format dates
    const formatDate = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    };

    const checkInFormatted = booking.check_in_date ? formatDate(booking.check_in_date) : "";
    const checkOutFormatted = booking.check_out_date ? formatDate(booking.check_out_date) : "";

    const appointments = (booking as any).appointments ?? [];
    const checkInApt = appointments.find((a: any) => a.appointment_type === "check_in");
    const checkOutApt = appointments.find((a: any) => a.appointment_type === "check_out");
    const checkInTime = checkInApt?.scheduled_at?.includes("T")
      ? checkInApt.scheduled_at.split("T")[1]?.substring(0, 5) ?? ""
      : "";
    const checkOutTime = checkOutApt?.scheduled_at?.includes("T")
      ? checkOutApt.scheduled_at.split("T")[1]?.substring(0, 5) ?? ""
      : "";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

    const applyVars = (text: string) =>
      text
        .replace(/\{\{nome_cliente\}\}/g, client.first_name)
        .replace(/\{\{nome_pensione\}\}/g, tenantName)
        .replace(/\{\{numero_prenotazione\}\}/g, booking.booking_number)
        .replace(/\{\{data_checkin\}\}/g, checkInFormatted)
        .replace(/\{\{data_checkout\}\}/g, checkOutFormatted)
        .replace(/\{\{orario_checkin\}\}/g, checkInTime)
        .replace(/\{\{orario_checkout\}\}/g, checkOutTime);

    const defaultSubject = `Conferma appuntamenti - Prenotazione n° {{numero_prenotazione}}`;
    const defaultBody = `Ciao {{nome_cliente}},\n\nti confermiamo i seguenti appuntamenti per la prenotazione n° {{numero_prenotazione}}:\n\nCheck-in: {{data_checkin}} alle {{orario_checkin}}\nCheck-out: {{data_checkout}} alle {{orario_checkout}}\n\nIn allegato trovi il modulo di affido da portare con te al check-in debitamente firmato.\n\nA presto,\n{{nome_pensione}}`;

    const subject = applyVars(tenant?.appuntamento_email_subject || defaultSubject);
    const rawBody = applyVars(tenant?.appuntamento_email_body || defaultBody);

    const bodyHtml = rawBody
      .split("\n")
      .map((line: string) => line.trim() === "" ? "<br>" : `<p style="margin:0 0 8px">${line}</p>`)
      .join("");

    const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">${bodyHtml}</div>`;

    const pdfFilename = filename || `Modulo_Affido_${booking.booking_number}.pdf`;

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
        attachments: [{ filename: pdfFilename, content: pdf_base64 }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    await supabaseAdmin.from("email_logs").insert({
      tenant_id: booking.tenant_id,
      client_id: (booking as any).client_id ?? null,
      booking_id,
      direction: "sent",
      email_type: "appuntamento",
      subject,
      recipient_email: client.email,
      status: "sent",
      body_html: html,
    });

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
