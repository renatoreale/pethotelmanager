import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Blocco 27: estrazione di dati strutturati da un messaggio libero del
// cliente (es. incollato da WhatsApp, email o appunti di una telefonata).
// Questa funzione NON scrive nulla sul database: restituisce solo i campi
// estratti, che lo staff rivede ed eventualmente corregge prima di aprire un
// preventivo — l'identificazione del cliente resta sempre una conferma
// manuale (vedi ExtractQuoteRequestDialog.tsx), l'AI non crea né abbina
// automaticamente nessun record.
const SYSTEM_PROMPT = `Estrai i dati di una richiesta di soggiorno per animali da un testo libero scritto da o su un cliente italiano (es. copiato da WhatsApp, email o appunti di una telefonata). Oggi è ${new Date().toISOString().slice(0, 10)}.

Rispondi SOLO con un oggetto JSON valido, nessun testo prima o dopo, con esattamente questa forma:
{
  "client_name": string | null,     // nome e cognome del cliente se menzionati, altrimenti null
  "client_phone": string | null,    // numero di telefono se presente, altrimenti null
  "client_email": string | null,    // email se presente, altrimenti null
  "check_in_date": string | null,   // formato YYYY-MM-DD, dedotto anche da espressioni relative ("dal 10 dicembre", "da lunedì prossimo"); null se non deducibile con certezza
  "check_out_date": string | null,  // formato YYYY-MM-DD, stessa logica
  "num_pets": number | null,        // quanti animali, se deducibile
  "pet_names": string | null,       // nomi degli animali separati da virgola, se menzionati
  "notes": string          // riassunto conciso in italiano di richieste speciali, esigenze particolari o altro dettaglio utile (es. terapie, allergie); stringa vuota se non c'è nulla di rilevante
}
Non inventare dati non presenti nel testo: se un'informazione non è deducibile, usa null (o stringa vuota per notes).`;

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

    const { tenant_id, text } = await req.json();
    if (!tenant_id || !text || !String(text).trim()) {
      throw new Error("tenant_id e text sono richiesti");
    }
    if (String(text).length > 4000) {
      throw new Error("Testo troppo lungo (massimo 4000 caratteri)");
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", caller.id)
      .single();
    if (!callerProfile || callerProfile.tenant_id !== tenant_id) {
      throw new Error("Non autorizzato per questa pensione");
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, ai_quote_extraction_enabled")
      .eq("id", tenant_id)
      .single();
    if (!tenant?.ai_quote_extraction_enabled) {
      throw new Error("L'estrazione AI delle richieste non è abilitata per questa pensione. Contatta l'assistenza per attivarla.");
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY non configurata: chiedi a chi gestisce il progetto Supabase di impostarla nei secrets delle Edge Function.");
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: String(text) }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Errore dal servizio AI: ${err}`);
    }

    const aiResult = await aiRes.json();
    const rawText = aiResult?.content?.find((b: any) => b.type === "text")?.text ?? "";

    let parsed: {
      client_name: string | null; client_phone: string | null; client_email: string | null;
      check_in_date: string | null; check_out_date: string | null;
      num_pets: number | null; pet_names: string | null; notes: string;
    };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      throw new Error("Risposta AI non valida, riprova");
    }

    return new Response(
      JSON.stringify({ extracted: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
