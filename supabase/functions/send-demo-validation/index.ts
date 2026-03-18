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

    const { error: insertError } = await supabase.from("demo_leads").insert({
      full_name: firstName.trim(),
      last_name: lastName?.trim() || null,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      lead_type: resolvedLeadType,
      pensione_name: pensioneName?.trim() || null,
      message: message?.trim() || null,
      privacy_accepted: true,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Errore nel salvataggio della richiesta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
