import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getClient() {
  const client = await new Client().connect({
    hostname: Deno.env.get("MYSQL_HOST")!,
    port: parseInt(Deno.env.get("MYSQL_PORT") || "3306"),
    db: Deno.env.get("MYSQL_DATABASE")!,
    username: Deno.env.get("MYSQL_USER")!,
    password: Deno.env.get("MYSQL_PASSWORD")!,
  });
  return client;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let client: Client | null = null;

  try {
    const { action, ...params } = await req.json();

    client = await getClient();

    // Auto-create table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS demo_leads (
        id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        privacy_accepted TINYINT(1) NOT NULL DEFAULT 0,
        confirmed TINYINT(1) NOT NULL DEFAULT 0,
        confirmed_at DATETIME,
        token VARCHAR(36) DEFAULT (UUID()),
        lead_type VARCHAR(50) NOT NULL DEFAULT 'prova_gratuita',
        pensione_name VARCHAR(255),
        message TEXT,
        activation_link TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add activation_link column if missing (for existing tables)
    try {
      await client.execute("ALTER TABLE demo_leads ADD COLUMN activation_link TEXT");
    } catch (_) {
      // column already exists
    }

    if (action === "insert") {
      const { full_name, last_name, email, phone, lead_type, pensione_name, message, base_url } = params;
      const token = crypto.randomUUID();
      const activationLink = base_url ? `${base_url}/confirm-demo?token=${token}` : null;
      await client.execute(
        `INSERT INTO demo_leads (full_name, last_name, email, phone, privacy_accepted, lead_type, pensione_name, message, token, activation_link)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
        [full_name, last_name || null, email, phone || null, lead_type || "prova_gratuita", pensione_name || null, message || null, token, activationLink]
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const rows = await client.query("SELECT * FROM demo_leads ORDER BY created_at DESC");
      return new Response(JSON.stringify({ data: rows }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { id } = params;
      await client.execute(
        "UPDATE demo_leads SET confirmed = 1, confirmed_at = NOW() WHERE id = ?",
        [id]
      );
      // Fetch the updated row to return the token
      const rows = await client.query("SELECT * FROM demo_leads WHERE id = ?", [id]);
      return new Response(JSON.stringify({ success: true, data: rows[0] || null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_by_token") {
      const { token } = params;
      await client.execute(
        "UPDATE demo_leads SET confirmed = 1, confirmed_at = NOW() WHERE token = ? AND confirmed = 0",
        [token]
      );
      const rows = await client.query("SELECT * FROM demo_leads WHERE token = ?", [token]);
      if (!rows.length) {
        return new Response(JSON.stringify({ status: "not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const lead = rows[0] as any;
      const wasAlready = lead.confirmed === 1 && lead.confirmed_at !== null;
      return new Response(JSON.stringify({ status: "confirmed", was_already_confirmed: wasAlready, data: lead }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MySQL error:", error);
    return new Response(JSON.stringify({ error: "Errore database: " + (error instanceof Error ? error.message : "Sconosciuto") }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});
