import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Deve restare sincronizzato con STRIPE_TIERS.mensile.product_id in src/lib/stripe-config.ts:
// la sospensione è disponibile solo per il piano Mensile.
const MENSILE_PRODUCT_ID = "prod_V8ELiZODy03VqI";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    if (action !== "pause" && action !== "resume" && action !== "status") {
      throw new Error("Azione non valida");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    const tenantId: string | null = profile?.tenant_id ?? null;
    if (!tenantId) throw new Error("Nessuna pensione associata all'utente");

    const { data: tenant } = await supabaseClient
      .from("tenants")
      .select("stripe_subscription_id")
      .eq("id", tenantId)
      .single();

    if (!tenant?.stripe_subscription_id) {
      throw new Error("Nessun abbonamento Stripe trovato per questa pensione");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
    const productId = subscription.items.data[0]?.price?.product;

    if (action === "status") {
      return new Response(JSON.stringify({
        product_id: productId,
        is_paused: !!subscription.pause_collection,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (productId !== MENSILE_PRODUCT_ID) {
      throw new Error("La sospensione è disponibile solo per il piano Mensile");
    }

    if (action === "pause") {
      await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        pause_collection: { behavior: "void" },
      });
      await supabaseClient.from("tenants").update({ subscription_status: "paused" }).eq("id", tenantId);
    } else {
      await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        pause_collection: null,
      });
      await supabaseClient.from("tenants").update({ subscription_status: "active" }).eq("id", tenantId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
