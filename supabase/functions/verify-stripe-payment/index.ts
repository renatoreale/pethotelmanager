import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non autorizzato");

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("booking_id mancante");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find the checkout session for this booking
    const sessions = await stripe.checkout.sessions.list({ limit: 10 });
    const session = sessions.data.find(
      (s) => s.metadata?.booking_id === booking_id && s.payment_status === "paid"
    );

    if (!session) {
      return new Response(JSON.stringify({ confirmed: false, reason: "Pagamento non trovato o non completato" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if booking is still in "preventivo" status
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, tenant_id, deposit_amount, total_amount")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Prenotazione non trovata");
    }

    if (booking.status !== "preventivo") {
      return new Response(JSON.stringify({ confirmed: true, reason: "Già confermata" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const amountPaid = (session.amount_total || 0) / 100;

    // Register the payment
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        booking_id: booking.id,
        tenant_id: booking.tenant_id,
        amount: amountPaid,
        payment_type: "caparra",
        method: "Carta (Stripe)",
        notes: `Pagamento Stripe - Session ${session.id}`,
        payment_date: new Date().toISOString(),
        created_by: user.id,
      });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      throw new Error("Errore nella registrazione del pagamento");
    }

    // Confirm the booking
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "confermata" })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Booking update error:", updateError);
      throw new Error("Errore nella conferma della prenotazione");
    }

    return new Response(JSON.stringify({ confirmed: true, amount: amountPaid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("verify-stripe-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
