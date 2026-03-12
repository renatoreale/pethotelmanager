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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non autorizzato");

    const { booking_id, amount, description } = await req.json();
    if (!booking_id || !amount) throw new Error("Parametri mancanti");

    // Get booking to find tenant_id
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("tenant_id")
      .eq("id", booking_id)
      .single();
    if (bookingErr || !booking) throw new Error("Prenotazione non trovata");

    // Get tenant's Stripe secret key
    const { data: stripeConfig, error: stripeErr } = await supabaseAdmin
      .from("tenant_stripe_keys")
      .select("stripe_secret_key")
      .eq("tenant_id", booking.tenant_id)
      .single();

    if (stripeErr || !stripeConfig?.stripe_secret_key) {
      throw new Error("Questa pensione non ha configurato i pagamenti Stripe. Contatta la pensione per assistenza.");
    }

    const stripe = new Stripe(stripeConfig.stripe_secret_key, {
      apiVersion: "2025-08-27.basil",
    });

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description || `Caparra prenotazione`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        booking_id,
        user_id: user.id,
        tenant_id: booking.tenant_id,
      },
      success_url: `${origin}/cliente/preventivi?payment=success&booking=${booking_id}`,
      cancel_url: `${origin}/cliente/preventivi?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
