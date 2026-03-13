import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, phone, leadType, pensioneName, message, baseUrl } = await req.json();

    const resolvedLeadType = leadType === "demo_live" ? "demo_live" : "prova_gratuita";

    // Server-side validation
    const DISPOSABLE_DOMAINS = [
      "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
      "yopmail.com","sharklasers.com","dispostable.com","trashmail.com",
      "fakeinbox.com","maildrop.cc","10minutemail.com","temp-mail.org",
      "getnada.com","mohmal.com","emailondeck.com","discard.email",
      "test.com","example.com","test.it","prova.com","prova.it"
    ];

    if (!firstName || firstName.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Il nome deve avere almeno 2 caratteri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resolvedLeadType === "prova_gratuita" && (!lastName || lastName.trim().length < 2)) {
      return new Response(JSON.stringify({ error: "Il cognome deve avere almeno 2 caratteri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Email non valida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = email.trim().toLowerCase().split("@")[1];
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return new Response(JSON.stringify({ error: "Usa un indirizzo email reale" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resolvedLeadType === "prova_gratuita") {
      if (!phone) {
        return new Response(JSON.stringify({ error: "Il telefono è obbligatorio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const digits = phone.replace(/[\s\-\+\(\)]/g, "");
      if (digits.length < 9 || digits.length > 13) {
        return new Response(JSON.stringify({ error: "Numero di telefono non valido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Write to MySQL via mysql-demo-leads function
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const mysqlRes = await fetch(`${SUPABASE_URL}/functions/v1/mysql-demo-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: "insert",
        full_name: firstName.trim(),
        last_name: lastName?.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone || null,
        lead_type: resolvedLeadType,
        pensione_name: pensioneName?.trim() || null,
        message: message?.trim() || null,
        base_url: baseUrl || null,
      }),
    });

    if (!mysqlRes.ok) {
      const errText = await mysqlRes.text();
      console.error("MySQL insert error:", errText);
      return new Response(JSON.stringify({ error: "Errore nel salvataggio della richiesta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Errore nell'invio della richiesta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
