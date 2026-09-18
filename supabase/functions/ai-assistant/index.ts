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

Hai accesso in SOLA LETTURA ai dati di questa pensione tramite gli strumenti forniti: usali per rispondere a domande su clienti, animali ospitati (anagrafica, microchip, note mediche/alimentari), chi è presente in struttura ora, prenotazioni, appuntamenti di check-in/check-out, disponibilità casette, pagamenti, clienti da ricontattare, attività di planning (task, farmaci, pasti) e sulla giornata odierna. Non inventare mai dati: se uno strumento non trova nulla, dillo chiaramente.

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
    name: "search_pets",
    description: "Cerca animali (pet) per nome, razza o microchip. Restituisce anagrafica completa: razza, colore, sesso, microchip, peso, sterilizzazione, note mediche/alimentari/comportamentali e proprietario. Al massimo 5 risultati.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Nome del pet, razza o numero di microchip" } },
      required: ["query"],
    },
  },
  {
    name: "get_current_guests",
    description: "Elenco e conteggio degli animali attualmente presenti in struttura oggi (check-in effettuato, check-out non ancora avvenuto). Puoi filtrare per specie.",
    input_schema: {
      type: "object",
      properties: {
        pet_type: { type: "string", description: "Filtra per specie: 'gatti' o 'cani' (opzionale; se omesso restituisce tutti, con conteggio per specie)" },
      },
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
    description: "Recupera i dettagli di una prenotazione dato il suo numero (booking_number): stato, date, totale, pagamenti registrati, animali ospitati, appuntamenti di check-in/check-out fissati (con orario).",
    input_schema: {
      type: "object",
      properties: { booking_number: { type: "string" } },
      required: ["booking_number"],
    },
  },
  {
    name: "get_appointments_for_date",
    description: "Elenco degli appuntamenti di check-in e check-out fissati per una data, con orario, cliente e prenotazione collegata.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Formato YYYY-MM-DD (opzionale, default oggi)" },
      },
    },
  },
  {
    name: "get_availability",
    description: "Disponibilità casette (singole/doppie) giorno per giorno in un intervallo di date: quante sono occupate e quante libere. Utile per capire se c'è posto per una nuova richiesta. Intervallo massimo 30 giorni.",
    input_schema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Formato YYYY-MM-DD (opzionale, default oggi)" },
        date_to: { type: "string", description: "Formato YYYY-MM-DD (opzionale, default 7 giorni dopo date_from)" },
      },
    },
  },
  {
    name: "get_client_opportunities",
    description: "Clienti da ricontattare: senza soggiorni recenti né in programma, clienti ricorrenti, ritorni stagionali attesi (stesso periodo dell'anno scorso ma senza nuova prenotazione) e clienti di valore (spesa totale sopra soglia).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_today_summary",
    description: "Riepilogo della giornata odierna: check-in previsti, check-out previsti, numero prenotazioni attive, pagamenti ancora aperti su soggiorni già conclusi.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_today_tasks",
    description: "Elenco delle attività di planning (task, farmaci, pasti, pulizie, controlli, ecc.) già inserite in agenda per una data, sia completate che da fare. Se non specifichi la data usa oggi.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Formato YYYY-MM-DD (opzionale, default oggi)" },
      },
    },
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

// Lista completa (allineata a OccupancyGrid.tsx/useClientOpportunities.ts):
// mancavano appuntamento_in_fissato/out_fissato/in_out_fissato, che
// facevano sottocontare le prenotazioni attive negli strumenti esistenti.
const ACTIVE_STATUSES = [
  "confermata", "appuntamento_fissato", "appuntamento_in_fissato",
  "appuntamento_out_fissato", "appuntamento_in_out_fissato",
  "check_in", "in_corso", "check_out", "chiusa",
];

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

  if (name === "search_pets") {
    const q = String(input.query ?? "").trim();
    if (!q) return { results: [] };
    const { data, error } = await supabaseAdmin
      .from("cats")
      .select("id, name, breed, color, gender, microchip, weight_kg, is_neutered, medical_notes, dietary_notes, behavioral_notes, client:clients(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .or(`name.ilike.%${q}%,breed.ilike.%${q}%,microchip.ilike.%${q}%`)
      .limit(5);
    if (error) throw error;
    return { results: data ?? [] };
  }

  if (name === "get_current_guests") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from("cat_registry")
      .select("cat_name, client_name, check_in_date, check_out_date, cats:cat_id(pet_type, breed), booking:booking_id(check_out_date)")
      .eq("tenant_id", tenantId)
      .lte("check_in_date", todayStr);
    if (error) throw error;
    const present = (data ?? []).filter((e: any) => {
      const checkOut = e.check_out_date || e.booking?.check_out_date;
      return !checkOut || checkOut >= todayStr;
    });
    const countsByPetType: Record<string, number> = {};
    for (const e of present) {
      const pt = e.cats?.pet_type ?? "sconosciuto";
      countsByPetType[pt] = (countsByPetType[pt] ?? 0) + 1;
    }
    const filtered = input.pet_type ? present.filter((e: any) => e.cats?.pet_type === input.pet_type) : present;
    return {
      date: todayStr,
      total_present: present.length,
      counts_by_pet_type: countsByPetType,
      guests: filtered.map((e: any) => ({
        name: e.cat_name,
        client_name: e.client_name,
        pet_type: e.cats?.pet_type ?? null,
        breed: e.cats?.breed ?? null,
      })),
    };
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
      .select("id, booking_number, status, check_in_date, check_out_date, total_amount, notes, client:clients(first_name, last_name, phone, email), booking_cats(cats(name)), payments(amount, payment_type, payment_date), appointments(appointment_type, scheduled_at, confirmed)")
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

  if (name === "get_appointments_for_date") {
    const dateStr = input.date || new Date().toISOString().slice(0, 10);
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("appointment_type, scheduled_at, confirmed, booking:bookings(booking_number, status, client:clients(first_name, last_name, phone), booking_cats(cats(name)))")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd)
      .order("scheduled_at");
    if (error) throw error;
    return { date: dateStr, appointments: data ?? [] };
  }

  if (name === "get_availability") {
    const dateFrom = input.date_from || new Date().toISOString().slice(0, 10);
    const fromDate = new Date(`${dateFrom}T00:00:00Z`);
    const defaultTo = new Date(fromDate);
    defaultTo.setUTCDate(defaultTo.getUTCDate() + 6);
    const dateTo = input.date_to || defaultTo.toISOString().slice(0, 10);
    const toDate = new Date(`${dateTo}T00:00:00Z`);
    const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    if (rangeDays <= 0 || rangeDays > 30) {
      throw new Error("Intervallo date non valido: usa date_from <= date_to, massimo 30 giorni.");
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("pet_type, occupancy_rule_days, num_singole, num_doppie, num_singole_gatti, num_doppie_gatti, num_singole_cani, num_doppie_cani")
      .eq("id", tenantId)
      .single();
    const occupancyRuleDays = tenant?.occupancy_rule_days ?? 3;
    const isEntrambi = tenant?.pet_type === "entrambi";

    // Prenotazioni il cui soggiorno tocca l'intervallo richiesto (il taglio
    // esatto ai giorni occupati per i gatti, secondo la regola occupancy_rule_days,
    // viene applicato dopo con la stessa logica di OccupancyGrid.tsx).
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("check_in_date, check_out_date, pet_type, cage_pool_type, units_occupied")
      .eq("tenant_id", tenantId)
      .in("status", ACTIVE_STATUSES)
      .lte("check_in_date", dateTo)
      .gte("check_out_date", dateFrom);
    if (error) throw error;

    const days: { date: string; singola_occupate: number; singola_libere: number; doppia_occupate: number; doppia_libere: number; pool?: string }[] = [];
    const pools = isEntrambi ? ["gatti", "cani"] as const : [null] as const;

    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(fromDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      for (const pool of pools) {
        let occSingola = 0;
        let occDoppia = 0;
        for (const b of (bookings ?? [])) {
          // pool è null per i tenant a specie unica: in quel caso si contano
          // tutte le prenotazioni indipendentemente da pet_type.
          if (pool && (b as any).pet_type !== pool) continue;
          const checkIn = new Date(`${(b as any).check_in_date}T00:00:00Z`);
          const checkOut = new Date(`${(b as any).check_out_date}T00:00:00Z`);
          const stayDays = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000) + 1;
          const isDog = (b as any).pet_type === "cani";
          const occDays = isDog ? stayDays : Math.min(occupancyRuleDays, stayDays);
          const dayIndex = Math.round((d.getTime() - checkIn.getTime()) / 86400000);
          if (dayIndex < 0 || dayIndex >= occDays) continue;
          const units = Number((b as any).units_occupied ?? 1);
          if ((b as any).cage_pool_type === "doppia") occDoppia += units;
          else occSingola += units;
        }
        const totSingola = pool === "gatti" ? (tenant?.num_singole_gatti ?? 0)
          : pool === "cani" ? (tenant?.num_singole_cani ?? 0)
          : (tenant?.num_singole ?? 0);
        const totDoppia = pool === "gatti" ? (tenant?.num_doppie_gatti ?? 0)
          : pool === "cani" ? (tenant?.num_doppie_cani ?? 0)
          : (tenant?.num_doppie ?? 0);
        days.push({
          date: dateStr,
          ...(pool ? { pool } : {}),
          singola_occupate: occSingola,
          singola_libere: Math.max(0, totSingola - occSingola),
          doppia_occupate: occDoppia,
          doppia_libere: Math.max(0, totDoppia - occDoppia),
        });
      }
    }

    return {
      date_from: dateFrom,
      date_to: dateTo,
      diviso_per_specie: isEntrambi,
      nota: "Non tiene conto di prenotazioni con casette miste singola+doppia nello stesso soggiorno, né di prenotazioni con animali misti gatto+cane nella stessa prenotazione (escluse dal conteggio per specie): per quei casi verifica manualmente in Occupazione Casette.",
      days,
    };
  }

  if (name === "get_client_opportunities") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const INACTIVE_DAYS = 60;
    const HIGH_VALUE_THRESHOLD = 300;
    const SEASONAL_WINDOW_DAYS = 21;

    const [{ data: bookings, error: bErr }, { data: clients, error: cErr }] = await Promise.all([
      supabaseAdmin.from("bookings")
        .select("id, client_id, check_in_date, check_out_date, total_amount")
        .eq("tenant_id", tenantId)
        .in("status", ACTIVE_STATUSES),
      supabaseAdmin.from("clients")
        .select("id, first_name, last_name, is_blacklisted")
        .eq("tenant_id", tenantId),
    ]);
    if (bErr) throw bErr;
    if (cErr) throw cErr;

    const byClient = new Map<string, any[]>();
    for (const b of (bookings ?? [])) {
      const arr = byClient.get((b as any).client_id) ?? [];
      arr.push(b);
      byClient.set((b as any).client_id, arr);
    }

    const daysBetween = (a: string, c: string) =>
      Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${c}T00:00:00Z`).getTime()) / 86400000);

    const toContact: any[] = [];
    const recurring: any[] = [];
    const seasonal: any[] = [];
    const highValue: any[] = [];

    for (const c of (clients ?? [])) {
      if ((c as any).is_blacklisted) continue;
      const clientBookings = byClient.get((c as any).id);
      if (!clientBookings || clientBookings.length === 0) continue;
      const clientName = `${(c as any).first_name} ${(c as any).last_name}`;

      const hasUpcomingOrCurrentStay = clientBookings.some((b) => daysBetween(b.check_out_date, todayStr) >= 0);
      if (!hasUpcomingOrCurrentStay) {
        const lastCheckOut = clientBookings.reduce((max, b) => b.check_out_date > max ? b.check_out_date : max, clientBookings[0].check_out_date);
        const daysSinceLastStay = daysBetween(todayStr, lastCheckOut);
        if (daysSinceLastStay >= INACTIVE_DAYS) {
          toContact.push({ client: clientName, days_since_last_stay: daysSinceLastStay });
        }

        const lastYearBooking = clientBookings.find((b) => Math.abs(daysBetween(todayStr, b.check_in_date) - 365) <= SEASONAL_WINDOW_DAYS);
        if (lastYearBooking) {
          seasonal.push({ client: clientName, last_year_checkin: lastYearBooking.check_in_date });
        }
      }

      if (clientBookings.length >= 2) {
        recurring.push({ client: clientName, stays_count: clientBookings.length });
      }

      const totalSpent = clientBookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
      if (totalSpent >= HIGH_VALUE_THRESHOLD) {
        highValue.push({ client: clientName, total_spent: totalSpent });
      }
    }

    toContact.sort((a, b) => b.days_since_last_stay - a.days_since_last_stay);
    recurring.sort((a, b) => b.stays_count - a.stays_count);
    seasonal.sort((a, b) => a.last_year_checkin.localeCompare(b.last_year_checkin));
    highValue.sort((a, b) => b.total_spent - a.total_spent);

    return {
      date: todayStr,
      soglie: { giorni_inattivita: INACTIVE_DAYS, soglia_alto_valore: HIGH_VALUE_THRESHOLD },
      da_ricontattare: toContact.slice(0, 10),
      ricorrenti: recurring.slice(0, 10),
      ritorni_stagionali_attesi: seasonal.slice(0, 10),
      clienti_alto_valore: highValue.slice(0, 10),
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

  if (name === "get_today_tasks") {
    const dateStr = input.date || new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from("planning_tasks")
      .select("title, description, category, priority, scheduled_time, completed, cat:cats(name), booking:bookings(booking_number)")
      .eq("tenant_id", tenantId)
      .eq("task_date", dateStr)
      .order("scheduled_time", { ascending: true, nullsFirst: false });
    if (error) throw error;
    const tasks = data ?? [];
    return {
      date: dateStr,
      total: tasks.length,
      pending: tasks.filter((t: any) => !t.completed).length,
      tasks,
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
