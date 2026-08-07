// One-off script (not a permanent app feature): seeds clearly-fictional demo
// records into the "la-zampa-felice" demo tenant ONLY, so screenshots for the
// social media campaign look populated. Idempotent: skips if already seeded.
// Meant to be invoked once manually, then the function can be deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_TENANT_SLUG = "la-zampa-felice";
const SEED_MARKER_EMAIL = "mario.rossi@demo-seed.invalid";

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, pet_type, num_singole, num_doppie")
      .eq("slug", DEMO_TENANT_SLUG)
      .single();
    if (tenantErr || !tenant) throw new Error("Tenant la-zampa-felice non trovato: " + tenantErr?.message);
    const tenantId = tenant.id;

    // Idempotency guard: if the marker client already exists, don't duplicate.
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", SEED_MARKER_EMAIL)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already seeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCatOnly = tenant.pet_type === "gatti";
    const petLabel = isCatOnly ? "gatti" : "cani";

    const CLIENTS = [
      { first_name: "Mario", last_name: "Rossi", email: SEED_MARKER_EMAIL, phone: "3331234567" },
      { first_name: "Giulia", last_name: "Bianchi", email: "giulia.bianchi@demo-seed.invalid", phone: "3339876543" },
      { first_name: "Luca", last_name: "Verdi", email: "luca.verdi@demo-seed.invalid", phone: "3345551122" },
      { first_name: "Francesca", last_name: "Russo", email: "francesca.russo@demo-seed.invalid", phone: "3487894561" },
      { first_name: "Andrea", last_name: "Colombo", email: "andrea.colombo@demo-seed.invalid", phone: "3291122334" },
    ];

    const { data: insertedClients, error: clientsErr } = await supabase
      .from("clients")
      .insert(CLIENTS.map((c) => ({ ...c, tenant_id: tenantId })))
      .select("id, first_name");
    if (clientsErr) throw clientsErr;

    const PETS = [
      { name: "Whiskey", breed: "Europeo", color: "Grigio tigrato", dietary_notes: "Crocchette senza cereali, due pasti al giorno", medical_notes: "Nessuna patologia nota", behavioral_notes: "Ansioso con altri gatti, meglio in casetta singola" },
      { name: "Luna", breed: "Siamese", color: "Crema e marrone", dietary_notes: "Umido la mattina, crocchette la sera", medical_notes: "Lieve insufficienza renale, dieta controllata", behavioral_notes: "Molto socievole, ama il contatto umano" },
      { name: "Simba", breed: "Maine Coon", color: "Rosso", dietary_notes: "Porzioni abbondanti, tende al sovrappeso", medical_notes: "Nessuna patologia nota", behavioral_notes: "Tranquillo, dorme molto" },
      { name: "Mia", breed: "Certosino", color: "Grigio blu", dietary_notes: "Crocchette dietetiche", medical_notes: "Allergia a certi conservanti alimentari", behavioral_notes: "Timida i primi giorni, poi molto affettuosa" },
      { name: "Leo", breed: "Europeo", color: "Nero", dietary_notes: "Alimentazione standard", medical_notes: "Vaccinazioni regolari, nessuna nota particolare", behavioral_notes: "Giocherellone, va tenuto d'occhio con oggetti piccoli" },
    ];

    const catsToInsert = PETS.map((p, i) => ({
      tenant_id: tenantId,
      client_id: insertedClients[i].id,
      name: p.name,
      breed: p.breed,
      color: p.color,
      gender: i % 2 === 0 ? "M" : "F",
      is_neutered: true,
      needs_double_cage: i === 1,
      pet_type: isCatOnly ? "gatti" : "cani",
      dietary_notes: p.dietary_notes,
      medical_notes: p.medical_notes,
      behavioral_notes: p.behavioral_notes,
    }));

    const { data: insertedCats, error: catsErr } = await supabase
      .from("cats")
      .insert(catsToInsert)
      .select("id, client_id, name");
    if (catsErr) throw catsErr;

    // Bookings: mix of past (checked out), one in progress, a few upcoming confirmed.
    const BOOKINGS = [
      { clientIdx: 0, status: "check_out", checkIn: isoDate(-10), checkOut: isoDate(-6), cage: "singola", total: 180, deposit: 60 },
      { clientIdx: 1, status: "in_corso", checkIn: isoDate(-2), checkOut: isoDate(3), cage: "doppia", total: 260, deposit: 100 },
      { clientIdx: 2, status: "confermata", checkIn: isoDate(4), checkOut: isoDate(9), cage: "singola", total: 220, deposit: 80 },
      { clientIdx: 3, status: "confermata", checkIn: isoDate(6), checkOut: isoDate(8), cage: "singola", total: 90, deposit: 30 },
      { clientIdx: 4, status: "preventivo", checkIn: isoDate(12), checkOut: isoDate(17), cage: "singola", total: 210, deposit: 0 },
    ];

    const bookingsToInsert = BOOKINGS.map((b, i) => ({
      tenant_id: tenantId,
      client_id: insertedClients[b.clientIdx].id,
      booking_number: `DEMO-${String(i + 1).padStart(4, "0")}`,
      status: b.status,
      check_in_date: b.checkIn,
      check_out_date: b.checkOut,
      cage_pool_type: b.cage,
      units_occupied: 1,
      total_amount: b.total,
      deposit_amount: b.deposit,
      pet_type: isCatOnly ? "gatti" : "cani",
      notes: `Prenotazione demo per ${PETS[b.clientIdx].name}`,
    }));

    const { data: insertedBookings, error: bookingsErr } = await supabase
      .from("bookings")
      .insert(bookingsToInsert)
      .select("id, deposit_amount, status");
    if (bookingsErr) throw bookingsErr;

    // Payments: a caparra for each booking that has a deposit_amount > 0.
    const paymentsToInsert = insertedBookings
      .filter((b: any) => b.deposit_amount > 0)
      .map((b: any) => ({
        tenant_id: tenantId,
        booking_id: b.id,
        payment_type: "caparra",
        amount: b.deposit_amount,
        method: "bonifico",
      }));
    if (paymentsToInsert.length > 0) {
      const { error: paymentsErr } = await supabase.from("payments").insert(paymentsToInsert);
      if (paymentsErr) throw paymentsErr;
    }

    // Quote requests: a couple of pending ones for the preventivi view.
    const quoteRequestsToInsert = [
      { tenant_id: tenantId, client_id: insertedClients[0].id, check_in_date: isoDate(20), check_out_date: isoDate(25), num_pets: 1, pet_names: PETS[0].name, status: "pending" },
      { tenant_id: tenantId, client_id: insertedClients[3].id, check_in_date: isoDate(22), check_out_date: isoDate(24), num_pets: 1, pet_names: PETS[3].name, status: "pending" },
    ];
    const { error: quotesErr } = await supabase.from("quote_requests").insert(quoteRequestsToInsert);
    if (quotesErr) throw quotesErr;

    // Planning tasks: a few for today/tomorrow.
    const tasksToInsert = [
      { tenant_id: tenantId, title: `Check-out ${PETS[0].name}`, description: "Preparare documenti e saldo finale", task_date: isoDate(-6) },
      { tenant_id: tenantId, title: "Pulizia casette libere", description: "Sanificazione dopo check-out di stamattina", task_date: isoDate(0) },
      { tenant_id: tenantId, title: `Check-in ${PETS[2].name}`, description: "Preparare casetta singola e kit di benvenuto", task_date: isoDate(4) },
    ];
    const { error: tasksErr } = await supabase.from("planning_tasks").insert(tasksToInsert);
    if (tasksErr) throw tasksErr;

    return new Response(
      JSON.stringify({
        success: true,
        skipped: false,
        created: {
          clients: insertedClients.length,
          cats: insertedCats.length,
          bookings: insertedBookings.length,
          payments: paymentsToInsert.length,
          quote_requests: quoteRequestsToInsert.length,
          planning_tasks: tasksToInsert.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-demo-data error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
