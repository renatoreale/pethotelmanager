import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Assistente virtuale (Blocco 26): accesso in SOLA LETTURA ai dati della
// pensione tramite tool-use. Nessuno strumento qui sotto scrive sul database:
// l'unica azione "critica" disponibile (propose_create_task) restituisce una
// proposta che lo staff deve confermare manualmente lato client, dove passa
// dalla normale mutation React Query (già protetta da RLS) — l'edge function
// non esegue mai scritture.
const SYSTEM_PROMPT = `Sei l'assistente virtuale di Pet Hotel Manager, il gestionale di una pensione per animali italiana. Rispondi sempre in italiano, in modo conciso e concreto, senza frasi da "startup generica".

Hai accesso in SOLA LETTURA ai dati di questa pensione tramite gli strumenti forniti: usali per rispondere a domande su clienti, prenotazioni, pagamenti e sulla giornata odierna. Non inventare mai dati: se uno strumento non trova nulla, dillo chiaramente.

Non puoi eseguire azioni che modificano i dati. Se l'utente ti chiede di creare un'attività di planning (promemoria, farmaco, pulizia, ecc.) usa lo strumento propose_create_task: verrà mostrata allo staff, che deve confermarla manualmente, tu non la crei direttamente. Per qualsiasi altra richiesta di modifica (prenotazioni, pagamenti, clienti, ecc.) spiega che al momento puoi solo consultare i dati e che l'azione va fatta dallo staff nella relativa pagina.`;

const TOOLS = [
  {
    name: "search_clients",
    description: "Cerca clienti per nome, cognome, telefono o email. Restituisce al massimo 5 risultati.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Testo di ricerca" } },
      required: ["query"],
    },
  },
  {
    name: "search_bookings",
    description: "Cerca prenotazioni per numero, nome cliente, stato o intervallo di date di check-in. Restituisce al massimo 10 risultati.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Numero prenotazione o nome cliente (opzionale)" },
        status: { type: "string", description: "Stato, es. preventivo, confermata, check_in, in_corso, check_out, chiusa, cancellata, rimborsata (opzionale)" },
        date_from: { type: "string", description: "Check-in minimo, formato YYYY-MM-DD (opzionale)" },
        date_to: { type: "string", description: "Check-in massimo, formato YYYY-MM-DD (opzionale)" },
      },
    },
  },
  {
    name: "get_booking_detail",
    description: "Recupera i dettagli di una prenotazione dato il suo numero (booking_number): stato, date, totale, pagamenti registrati, animali ospitati.",
    input_schema: {
      type: "object",
      properties: { booking_number: { type: "string" } },
      required: ["booking_number"],
    },
  },
  {
    name: "get_today_summary",
    description: "Riepilogo della giornata odierna: check-in previsti, check-out previsti, numero prenotazioni attive, pagamenti ancora aperti su soggiorni già conclusi.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_create_task",
    description: "Propone la creazione di un'attività di planning. NON viene eseguita: viene solo mostrata allo staff per conferma manuale.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        task_date: { type: "string", description: "Formato YYYY-MM-DD" },
        description: { type: "string" },
        scheduled_time: { type: "string", description: "Formato HH:MM (opzionale)" },
        category: { type: "string", description: "Una tra: alimentazione, farmaco, pulizia, check_in, check_out, foto, controllo, amministrazione, altro (opzionale)" },
        priority: { type: "string", description: "Una tra: bassa, media, alta, urgente (opzionale)" },
      },
      required: ["title", "task_date"],
    },
  },
];

const ACTIVE_STATUSES = ["confermata", "appuntamento_fissato", "check_in", "in_corso", "check_out", "chiusa"];

function calcRemaining(totalAmount: number, payments: { amount: number; payment_type: string }[]) {
  const paid = payments
    .filter((p) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s, p) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p) => p.payment_type === "rimborso")
    .reduce((s, p) => s + Number(p.amount), 0);
  return Math.max(0, totalAmount - (paid - refunded));
}

async function runReadOnlyTool(name: string, input: any, tenantId: string, supabaseAdmin: any) {
  if (name === "search_clients") {
    const q = String(input.query ?? "").trim();
    if (!q) return { results: [] };
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, first_name, last_name, phone, email")
      .eq("tenant_id", tenantId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5);
    if (error) throw error;
    return { results: data ?? [] };
  }

  if (name === "search_bookings") {
    let query = supabaseAdmin
      .from("bookings")
      .select("id, booking_number, status, check_in_date, check_out_date, total_amount, client:clients(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .limit(10);
    if (input.status) query = query.eq("status", input.status);
    if (input.date_from) query = query.gte("check_in_date", input.date_from);
    if (input.date_to) query = query.lte("check_in_date", input.date_to);
    if (input.query) query = query.or(`booking_number.ilike.%${input.query}%`);
    const { data, error } = await query;
    if (error) throw error;
    return { results: data ?? [] };
  }

  if (name === "get_booking_detail") {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_number, status, check_in_date, check_out_date, total_amount, notes, client:clients(first_name, last_name, phone, email), booking_cats(cats(name)), payments(amount, payment_type, payment_date)")
      .eq("tenant_id", tenantId)
      .eq("booking_number", input.booking_number)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { found: false };
    return {
      found: true,
      booking: data,
      remaining_amount: calcRemaining(Number((data as any).total_amount ?? 0), (data as any).payments ?? []),
    };
  }

  if (name === "get_today_summary") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [{ data: checkins }, { data: checkouts }, { data: active }, { data: overdue }] = await Promise.all([
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: false }).eq("tenant_id", tenantId).eq("check_in_date", todayStr),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: false }).eq("tenant_id", tenantId).eq("check_out_date", todayStr),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: false }).eq("tenant_id", tenantId).in("status", ACTIVE_STATUSES),
      supabaseAdmin.from("bookings").select("total_amount, payments(amount, payment_type)").eq("tenant_id", tenantId).in("status", ACTIVE_STATUSES).lt("check_out_date", todayStr),
    ]);
    const overduePayments = (overdue ?? []).filter((b: any) => calcRemaining(Number(b.total_amount ?? 0), b.payments ?? []) > 0).length;
    return {
      date: todayStr,
      checkins_today: (checkins ?? []).length,
      checkouts_today: (checkouts ?? []).length,
      active_bookings: (active ?? []).length,
      overdue_payments_count: overduePayments,
    };
  }

  throw new Error(`Strumento sconosciuto: ${name}`);
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autorizzato");

    const { tenant_id, messages } = await req.json();
    if (!tenant_id || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("tenant_id e messages sono richiesti");
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
      .select("id, ai_assistant_enabled")
      .eq("id", tenant_id)
      .single();
    if (!tenant?.ai_assistant_enabled) {
      throw new Error("L'assistente AI non è abilitato per questa pensione. Contatta l'assistenza per attivarlo.");
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY non configurata: chiedi a chi gestisce il progetto Supabase di impostarla nei secrets delle Edge Function.");
    }

    // Solo gli ultimi turni testuali arrivano dal client: i blocchi tool_use /
    // tool_result restano interni al ciclo qui sotto e non vengono mai
    // rispediti indietro, così il contratto con il frontend resta semplice
    // (testo semplice, nessun formato specifico di Anthropic).
    const recentMessages = (messages as { role: "user" | "assistant"; content: string }[]).slice(-12);
    const loopMessages: any[] = recentMessages.map((m) => ({ role: m.role, content: m.content }));

    let finalText = "";
    let proposal: { type: string; params: any } | null = null;

    for (let iteration = 0; iteration < 5; iteration++) {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1536,
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: loopMessages,
        }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.text();
        throw new Error(`Errore dal servizio AI: ${err}`);
      }

      const result = await aiRes.json();
      const blocks: any[] = result?.content ?? [];
      const toolUses = blocks.filter((b) => b.type === "tool_use");
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (text) finalText = text;

      if (toolUses.length === 0) break;

      loopMessages.push({ role: "assistant", content: blocks });

      const toolResults = [];
      for (const tu of toolUses) {
        if (tu.name === "propose_create_task") {
          proposal = { type: "create_planning_task", params: tu.input };
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: "Proposta registrata: verrà mostrata allo staff per conferma manuale, non è stata creata.",
          });
          continue;
        }
        try {
          const data = await runReadOnlyTool(tu.name, tu.input, tenant_id, supabaseAdmin);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(data) });
        } catch (e: any) {
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: `Errore: ${e.message}`, is_error: true });
        }
      }
      loopMessages.push({ role: "user", content: toolResults });
    }

    if (!finalText) {
      finalText = "Non sono riuscito a elaborare una risposta chiara, prova a riformulare la domanda.";
    }

    return new Response(
      JSON.stringify({ reply: finalText, proposal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
