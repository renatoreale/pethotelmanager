import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "0",
};

const DISPOSABLE_DOMAINS = [
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","dispostable.com","trashmail.com",
  "fakeinbox.com","maildrop.cc","10minutemail.com","temp-mail.org",
  "getnada.com","mohmal.com","emailondeck.com","discard.email",
  "test.com","example.com","test.it","prova.com","prova.it",
];

const DEMO_TENANT_SLUG = "la-zampa-felice";

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";
  if (!resendKey) throw new Error("RESEND_API_KEY non configurata");

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
    throw new Error("Resend error: " + err);
  }
}

function trialWelcomeHtml(firstName: string, recoveryLink: string, trialDays: number): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager</h2>
      <p>Ciao <strong>${firstName}</strong>!</p>
      <p>Grazie per aver richiesto la prova gratuita di PetHotelManager!<br/>
      Clicca il pulsante qui sotto per impostare la tua password e accedere subito:</p>
      <a href="${recoveryLink}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#c45a12;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Imposta la tua password
      </a>
      <p style="color:#555;font-size:14px;">
        Avrai <strong>${trialDays} giorni</strong> di accesso gratuito e completo —
        nessuna carta di credito richiesta.<br/>
        Il link è valido per 24 ore.
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
        <a href="${recoveryLink}" style="color:#c45a12;word-break:break-all;">${recoveryLink}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
      <p style="color:#999;font-size:12px;">PetHotelManager — Il gestionale per la tua pensione per animali</p>
    </div>
  `;
}

async function provisionTrial(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  fullName: string,
  phone: string,
  trialDays: number,
): Promise<void> {
  // 1. Find or create demo tenant
  let { data: demoTenant } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", DEMO_TENANT_SLUG)
    .single();

  if (!demoTenant) {
    console.warn("[register-trial] Demo tenant not found, creating...");
    const { data: newTenant, error: createError } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: "La Zampa Felice",
        slug: DEMO_TENANT_SLUG,
        num_singole: 10,
        num_doppie: 5,
        pet_type: "gatti",
        locale: "it",
      })
      .select("id")
      .single();

    if (createError || !newTenant) {
      console.error("[register-trial] Failed to create demo tenant:", createError);
      throw new Error("Demo tenant not found and could not be created");
    }
    demoTenant = newTenant;
  }

  const tenantId = demoTenant.id;

  // 2. Assign titolare role (skip if already exists)
  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existingRole) {
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "titolare",
      tenant_id: tenantId,
    });
    if (roleError) console.error("[register-trial] Error assigning role:", roleError);
  }

  // 3. Update profile
  await supabaseAdmin
    .from("profiles")
    .update({ tenant_id: tenantId, full_name: fullName, phone })
    .eq("user_id", userId);

  // 4. Create trial_registration (skip if already exists)
  const { data: existingTrial } = await supabaseAdmin
    .from("trial_registrations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingTrial) {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const { error: trialError } = await supabaseAdmin.from("trial_registrations").insert({
      user_id: userId,
      email,
      full_name: fullName,
      pet_type: "gatti",
      tenant_id: tenantId,
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
    });
    if (trialError) console.error("[register-trial] Error creating trial_registration:", trialError);
  }

  console.log(`[register-trial] Provisioning complete for user ${userId}, tenant ${tenantId}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { email, firstName, lastName, phone } = await req.json();

    // Validation
    if (!firstName || firstName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il nome deve avere almeno 2 caratteri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lastName || lastName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il cognome deve avere almeno 2 caratteri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const domain = email.trim().toLowerCase().split("@")[1];
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return new Response(JSON.stringify({ error: "Usa un indirizzo email reale" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: "Il telefono è obbligatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://pethotelmanager.com";
    const normalizedEmail = email.trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Get trial days
    const { data: landingConfig } = await supabaseAdmin
      .from("landing_config")
      .select("trial_days")
      .limit(1)
      .single();
    const trialDays = landingConfig?.trial_days || 14;

    // Create (or find existing) user in Supabase Auth
    let authUserId: string;
    let isNewUser = true;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        is_trial: true,
        phone: phone.trim(),
      },
    });

    if (authErr) {
      if (authErr.message.includes("already been registered") || authErr.message.includes("already registered")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (!existing) throw new Error("Utente già registrato ma non trovato");
        authUserId = existing.id;
        isNewUser = false;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: { ...existing.user_metadata, is_trial: true },
        });
      } else {
        throw authErr;
      }
    } else {
      authUserId = authData.user.id;
    }

    // Provision: assign role, profile, trial_registration — server-side with service role
    await provisionTrial(supabaseAdmin, authUserId, normalizedEmail, fullName, phone.trim(), trialDays);

    // Generate recovery link → /reset-password
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr) throw linkErr;
    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) throw new Error("Impossibile generare il link di accesso");

    // Send welcome email to user
    await sendEmail(
      normalizedEmail,
      `Imposta la tua password — PetHotelManager`,
      trialWelcomeHtml(firstName.trim(), recoveryLink, trialDays),
    );

    // Send notification email to admin user (role = 'admin')
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(10);

    let notificationEmail: string | null = null;
    if (adminRoles && adminRoles.length > 0) {
      const adminIds = adminRoles.map((r: any) => r.user_id);
      const { data: { users: adminUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const adminUser = adminUsers?.find((u: any) => adminIds.includes(u.id));
      notificationEmail = adminUser?.email || null;
    }

    if (notificationEmail) {
      const requestDate = new Date().toLocaleDateString("it-IT", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      await sendEmail(
        notificationEmail,
        `Nuova richiesta prova gratuita — ${fullName}`,
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#c45a12;margin:0 0 24px;">PetHotelManager — Nuova richiesta trial</h2>
          <p>È arrivata una nuova richiesta di prova gratuita:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:bold;width:140px;">Nome</td><td style="padding:8px 12px;border-top:1px solid #eee;">${fullName}</td></tr>
            <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:bold;">Email</td><td style="padding:8px 12px;border-top:1px solid #eee;"><a href="mailto:${normalizedEmail}">${normalizedEmail}</a></td></tr>
            <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:bold;">Telefono</td><td style="padding:8px 12px;border-top:1px solid #eee;">${phone.trim()}</td></tr>
            <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:bold;">Richiesta</td><td style="padding:8px 12px;border-top:1px solid #eee;">${requestDate}</td></tr>
            <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:bold;">Durata trial</td><td style="padding:8px 12px;border-top:1px solid #eee;">${trialDays} giorni</td></tr>
          </table>
          <p style="color:#666;font-size:13px;">L'utente è stato già provisionato automaticamente e può accedere all'app.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;">PetHotelManager — Sistema amministrativo</p>
        </div>`,
      ).catch((e) => console.warn("[register-trial] Admin notification email failed:", e.message));
    }

    return new Response(
      JSON.stringify({ success: true, is_new_user: isNewUser }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("register-trial error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
