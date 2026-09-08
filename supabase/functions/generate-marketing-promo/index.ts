import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Persona richiesta esplicitamente dal titolare: un Direttore Marketing
// Senior (strategia/tono) e un Copywriter Senior (testi finali) che
// collaborano sulla stessa promozione. Il modello risponde SOLO con un
// oggetto JSON, così il parsing lato server resta deterministico.
const MARKETING_SYSTEM_PROMPT = `Sei un team di marketing per pensioni per animali italiane, composto da due professionisti senior che collaborano sulla stessa promozione:
- un Direttore Marketing Senior, che decide posizionamento, tono e strategia;
- un Copywriter Senior, che scrive i testi finali in italiano concreto, senza frasi fatte da "startup generica" (niente "soluzione completa", "gestisci facilmente", ecc.).

Vi vengono forniti il nome della pensione, la città, il tipo di animali ospitati, il numero di foto reali già scelte per lo slideshow e un eventuale contesto aggiuntivo dal titolare (es. uno sconto, un periodo, un evento). Le foto sono reali (non generatele voi): il vostro compito è scrivere i testi che le accompagnano.

Rispondete SOLO con un oggetto JSON valido, nessun testo prima o dopo, con esattamente questa forma:
{
  "social_caption": string,        // post per Facebook/Instagram, 2-4 frasi, tono caldo e concreto, in prima persona plurale della pensione
  "social_hashtags": string,       // 5-8 hashtag pertinenti separati da spazio, es. "#pensionegatti #milano"
  "google_ad_headline": string,    // headline per Google Ads, massimo 30 caratteri
  "google_ad_description": string, // descrizione per Google Ads, massimo 90 caratteri
  "video_slides": string[]         // un testo breve (massimo 8 parole) di overlay per ciascuna foto, nello stesso ordine e nello stesso numero delle foto fornite, pensato per uno slideshow TikTok senza audio
}`;

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

    const { tenant_id, photo_urls, context_note } = await req.json();
    if (!tenant_id || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      throw new Error("tenant_id e almeno una foto (photo_urls) sono richiesti");
    }
    if (photo_urls.length > 8) {
      throw new Error("Puoi selezionare al massimo 8 foto");
    }

    // Il tenant_id arriva dal client: verifichiamo che chi chiama appartenga
    // davvero a quel tenant, per evitare che un utente generi promozioni (e
    // relativo consumo di API a pagamento) per una pensione diversa dalla
    // propria.
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
      .select("id, name, city, pet_type, marketing_promo_enabled")
      .eq("id", tenant_id)
      .single();
    if (!tenant?.marketing_promo_enabled) {
      throw new Error("La generazione di promozioni con AI non è abilitata per questa pensione. Contatta l'assistenza per attivarla.");
    }

    // TODO(setup): questa funzione richiede una chiave Anthropic per
    // generare i testi. Chi gestisce il progetto Supabase deve impostare il
    // secret ANTHROPIC_API_KEY nelle Edge Function Secrets (Dashboard
    // Supabase > Edge Functions > generate-marketing-promo > Secrets, o
    // `supabase secrets set ANTHROPIC_API_KEY=...`). Finché manca, la
    // funzione risponde con questo errore invece di fallire in silenzio.
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY non configurata: chiedi a chi gestisce il progetto Supabase di impostarla nei secrets delle Edge Function per abilitare la generazione dei testi.");
    }

    const petTypeLabel = tenant.pet_type === "cani" ? "cani" : tenant.pet_type === "entrambi" ? "cani e gatti" : "gatti";
    const userPrompt = `Pensione: ${tenant.name}
Città: ${tenant.city || "non indicata"}
Animali ospitati: ${petTypeLabel}
Numero di foto reali già scelte per lo slideshow: ${photo_urls.length}
Contesto aggiuntivo dal titolare: ${(context_note as string | undefined)?.trim() || "nessuno, crea una promozione generica per far conoscere la pensione"}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: MARKETING_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Errore dal servizio AI: ${err}`);
    }
    const aiResult = await aiRes.json();
    const rawText = aiResult?.content?.find((b: any) => b.type === "text")?.text ?? "";

    let parsed: {
      social_caption: string; social_hashtags: string;
      google_ad_headline: string; google_ad_description: string;
      video_slides: string[];
    };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      throw new Error("Risposta AI non valida, riprova");
    }

    const videoSlides = photo_urls.map((url: string, i: number) => ({
      photo_url: url,
      overlay_text: parsed.video_slides?.[i] ?? "",
    }));

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("marketing_promotions")
      .insert({
        tenant_id,
        created_by: caller.id,
        context_note: (context_note as string | undefined)?.trim() || null,
        photo_urls,
        social_caption: parsed.social_caption,
        social_hashtags: parsed.social_hashtags,
        google_ad_headline: parsed.google_ad_headline,
        google_ad_description: parsed.google_ad_description,
        video_slides: videoSlides,
      })
      .select()
      .single();
    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ success: true, promotion: saved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
