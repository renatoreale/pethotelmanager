import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_ORDERS_EMAIL") || "orders@pethotelmanager.com";
  if (!resendKey) { console.error("RESEND_API_KEY mancante"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `PetHotelManager <${fromEmail}>`, to: [to], subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verifica autenticazione tramite adminClient.auth.getUser(token)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: no token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      console.error("[activate-purchase] getUser error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: " + (userError?.message ?? "no user") }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[activate-purchase] user.id:", user.id);

    // Verifica ruolo admin
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    console.log("[activate-purchase] roles:", roles, "error:", rolesError?.message);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: ruolo admin non trovato" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { purchase_request_id } = body;
    if (!purchase_request_id) throw new Error("purchase_request_id mancante");
    console.log("[activate-purchase] purchase_request_id:", purchase_request_id);

    // 1. Carica la richiesta
    const { data: purchase, error: purchaseError } = await adminClient
      .from("purchase_requests")
      .select("*")
      .eq("id", purchase_request_id)
      .single();

    console.log("[activate-purchase] purchase:", purchase, "error:", purchaseError?.message);
    if (purchaseError || !purchase) throw new Error("Richiesta non trovata: " + purchaseError?.message);
    if (purchase.status !== "pagato") throw new Error("Stato non valido: " + purchase.status);

    const fullName = `${purchase.nome} ${purchase.cognome}`;
    const pianoLabel = purchase.piano.charAt(0).toUpperCase() + purchase.piano.slice(1);

    // 2. Genera slug univoco
    let slug = slugify(purchase.nome_pensione);
    const { data: existingSlug } = await adminClient
      .from("tenants")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    if (existingSlug) slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;

    // 3. Crea il tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: purchase.nome_pensione,
        slug,
        email: purchase.email,
        phone: purchase.telefono || null,
        address: purchase.citta_pensione,
        num_singole: 0,
        num_doppie: 0,
        pet_type: "gatti",
        locale: "it",
      })
      .select()
      .single();

    if (tenantError || !tenant) throw new Error("Errore creazione tenant: " + tenantError?.message);

    // 3bis. Collega il tenant al cliente/abbonamento Stripe della richiesta pagata
    if (purchase.stripe_session_id) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id);
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

        if (stripeCustomerId || stripeSubscriptionId) {
          await adminClient
            .from("tenants")
            .update({
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              subscription_status: "active",
            })
            .eq("id", tenant.id);
        }
      } catch (stripeErr) {
        console.error("[activate-purchase] errore recupero dati Stripe:", stripeErr);
      }
    }

    // 4. Crea o recupera l'utente
    let newUserId: string;
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: purchase.email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === purchase.email);
        if (!existingUser) throw new Error("Utente già esistente ma non trovato");
        newUserId = existingUser.id;
      } else {
        throw new Error("Errore creazione utente: " + createError.message);
      }
    } else {
      newUserId = createData.user.id;
    }

    // 5. Rimuovi associazioni con il tenant demo (la-zampa-felice) se presenti
    const { data: demoTenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", "la-zampa-felice")
      .maybeSingle();

    if (demoTenant) {
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", newUserId)
        .eq("tenant_id", demoTenant.id);

      // Marca trial come convertito
      await adminClient
        .from("trial_registrations")
        .update({ is_converted: true })
        .eq("user_id", newUserId);
    }

    // 6. Assegna ruolo titolare (skip se già esiste)
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", newUserId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!existingRole) {
      await adminClient.from("user_roles").insert({
        user_id: newUserId,
        role: "titolare",
        tenant_id: tenant.id,
      });
    }

    // 7. Aggiorna profilo
    await adminClient
      .from("profiles")
      .update({ tenant_id: tenant.id, full_name: fullName })
      .eq("user_id", newUserId);

    // 7. Genera recovery link per impostare la password
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: purchase.email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error("Errore generazione link: " + linkError?.message);
    }

    const recoveryLink = linkData.properties.action_link;

    // 8. Email di benvenuto con link per impostare la password
    const PIANOPRICES: Record<string, string> = {
      starter: "€300/anno", multi: "€720/anno", pro: "€1.080/anno", business: "€2.400/anno",
    };

    const welcomeHtml = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
        <p>Ciao <strong>${purchase.nome}</strong>,</p>
        <p>Il tuo account PetHotelManager è stato attivato! 🎉<br/>
        La tua pensione <strong>${purchase.nome_pensione}</strong> è pronta.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin:24px 0;font-size:14px;">
          <p style="margin:0 0 10px;font-weight:600;color:#333;">Dettagli account</p>
          <ul style="margin:0;padding-left:20px;color:#555;line-height:2;">
            <li>Pensione: <strong>${purchase.nome_pensione}</strong></li>
            <li>Piano: <strong>${pianoLabel}</strong> — ${PIANOPRICES[purchase.piano] ?? ""}</li>
            <li>Email: <strong>${purchase.email}</strong></li>
          </ul>
        </div>
        <p>Clicca il pulsante per impostare la tua password e accedere subito:</p>
        <a href="${recoveryLink}"
           style="display:inline-block;margin:16px 0 24px;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          Imposta la password e accedi
        </a>
        <p style="color:#666;font-size:13px;">Il link è valido per 24 ore.</p>
        <p style="color:#555;font-size:14px;">Per assistenza: <a href="mailto:orders@pethotelmanager.com" style="color:#c45a12;">orders@pethotelmanager.com</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
        <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
      </div>
    `;

    await sendEmail(purchase.email, "Account attivato — Benvenuto in PetHotelManager!", welcomeHtml);

    // 9. Aggiorna status → attivato
    await adminClient
      .from("purchase_requests")
      .update({ status: "attivato" })
      .eq("id", purchase_request_id);

    return new Response(JSON.stringify({ success: true, tenant_id: tenant.id, slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("activate-purchase error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
