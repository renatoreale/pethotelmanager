import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const action = body?.action === "confirm_by_token" ? "confirm_by_token" : "insert";

    // ── CONFIRM BY TOKEN ──────────────────────────────────────
    if (action === "confirm_by_token") {
      const token = typeof body?.token === "string" ? body.token.trim() : "";
      if (!token) {
        return new Response(JSON.stringify({ error: "Token non valido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: lead, error } = await supabase
        .from("demo_leads")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (error || !lead) {
        return new Response(JSON.stringify({ status: "not_found" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wasAlready = lead.confirmed === true;

      if (!wasAlready) {
        await supabase
          .from("demo_leads")
          .update({ confirmed: true, confirmed_at: new Date().toISOString() })
          .eq("token", token);
      }

      return new Response(JSON.stringify({ status: "confirmed", was_already_confirmed: wasAlready, data: lead }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSERT NEW LEAD ───────────────────────────────────────
    const { email, firstName, lastName, phone, leadType, pensioneName, message } = body;
    const resolvedLeadType = leadType === "demo_live" ? "demo_live" : "prova_gratuita";

    const DISPOSABLE_DOMAINS = [
      "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
      "yopmail.com", "sharklasers.com", "dispostable.com", "trashmail.com",
      "fakeinbox.com", "maildrop.cc", "10minutemail.com", "temp-mail.org",
      "getnada.com", "mohmal.com", "emailondeck.com", "discard.email",
      "test.com", "example.com", "test.it", "prova.com", "prova.it",
    ];

    if (!firstName || firstName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il nome deve avere almeno 2 caratteri" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resolvedLeadType === "prova_gratuita" && (!lastName || lastName.trim().length < 2)) {
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

    if (resolvedLeadType === "prova_gratuita") {
      if (!phone) {
        return new Response(JSON.stringify({ error: "Il telefono è obbligatorio" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const digits = phone.replace(/[\s\-\+\(\)]/g, "");
      if (digits.length < 9 || digits.length > 13) {
        return new Response(JSON.stringify({ error: "Numero di telefono non valido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("demo_leads")
      .insert({
        full_name: firstName.trim(),
        last_name: lastName?.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone || null,
        lead_type: resolvedLeadType,
        pensione_name: pensioneName?.trim() || null,
        message: message?.trim() || null,
        privacy_accepted: true,
      })
      .select("token")
      .single();

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Errore nel salvataggio della richiesta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invia email di attivazione automaticamente
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@pethotelmanager.com";
    const baseUrl = body.baseUrl || "https://pethotelmanager.com";
    const activationLink = `${baseUrl}/confirm-demo?token=${inserted.token}`;
    const fullName = `${firstName.trim()}${lastName ? " " + lastName.trim() : ""}`;

    if (resendKey) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#c45a12;font-size:24px;margin:0;">PetHotelManager</h1>
          </div>
          <h2 style="color:#1a1a1a;font-size:20px;">Ciao ${fullName}!</h2>
          <p style="color:#333;font-size:16px;line-height:1.6;">
            Grazie per aver richiesto la prova gratuita di PetHotelManager!
          </p>
          <p style="color:#333;font-size:16px;line-height:1.6;">
            Clicca il pulsante qui sotto per attivare il tuo accesso:
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${activationLink}"
               style="background-color:#c45a12;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
              Attiva la prova gratuita
            </a>
          </div>
          <p style="color:#666;font-size:14px;line-height:1.5;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:<br/>
            <a href="${activationLink}" style="color:#c45a12;word-break:break-all;">${activationLink}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;text-align:center;">
            PetHotelManager — Il gestionale per la tua pensione per animali
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: email.trim().toLowerCase(),
          subject: "Attiva la tua prova gratuita — PetHotelManager",
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Errore nell'invio della richiesta" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
