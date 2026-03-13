import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Solo gli admin possono approvare le richieste" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lead
    const { data: lead, error: leadError } = await adminClient
      .from("demo_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead non trovato" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lead.confirmed) {
      return new Response(JSON.stringify({ error: "Lead già approvato" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build activation link using token
    const token = lead.token;
    const siteUrl = SUPABASE_URL.replace('.supabase.co', '').includes('localhost') 
      ? 'http://localhost:5173' 
      : req.headers.get('origin') || req.headers.get('referer')?.replace(/\/+$/, '') || '';
    
    const activationLink = `${siteUrl}/confirm-demo?token=${token}`;

    // Send activation email via email queue
    const emailPayload = {
      to: lead.email,
      subject: "🎉 La tua demo PetHotelManager è stata approvata!",
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #c45a12; font-size: 24px; margin: 0;">PetHotelManager</h1>
          </div>
          <h2 style="color: #1a1a1a; font-size: 20px;">Ciao ${lead.full_name}!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            La tua richiesta di accesso alla demo gratuita è stata approvata dal nostro team.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Clicca il pulsante qui sotto per attivare il tuo accesso alla demo:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${activationLink}" 
               style="background-color: #c45a12; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
              Attiva la demo gratuita
            </a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br/>
            <a href="${activationLink}" style="color: #c45a12; word-break: break-all;">${activationLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
          <p style="color: #999; font-size: 12px; text-align: center;">
            PetHotelManager — Il gestionale per la tua pensione per animali
          </p>
        </div>
      `,
      text: `Ciao ${lead.full_name}! La tua demo è stata approvata. Attiva il tuo accesso: ${activationLink}`,
      run_id: crypto.randomUUID(),
    };

    // Enqueue the email
    const { error: enqueueError } = await adminClient.rpc("enqueue_email", {
      queue_name: "transactional_email_queue",
      payload: emailPayload,
    });

    if (enqueueError) {
      console.error("Enqueue error:", enqueueError);
      return new Response(JSON.stringify({ error: "Errore nell'invio dell'email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email: lead.email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("approve-demo-lead error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
