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

    // Auto-create tables if not exists
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
        expires_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS client_invites (
        id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
        client_id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        user_id VARCHAR(36),
        recovery_link TEXT,
        activated TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if missing (for existing client_invites tables)
    for (const col of ["recovery_link TEXT", "activated TINYINT(1) NOT NULL DEFAULT 0"]) {
      try {
        await client.execute(`ALTER TABLE client_invites ADD COLUMN ${col}`);
      } catch (_) {
        // column already exists
      }
    }

    // Add columns if missing (for existing tables)
    for (const col of ["activation_link TEXT", "expires_at DATETIME"]) {
      try {
        await client.execute(`ALTER TABLE demo_leads ADD COLUMN ${col}`);
      } catch (_) {
        // column already exists
      }
    }

    if (action === "insert") {
      const { full_name, last_name, email, phone, lead_type, pensione_name, message, base_url } = params;
      const token = crypto.randomUUID();
      const activationLink = base_url ? `${base_url}/confirm-demo?token=${token}` : null;
      // expires_at = NOW() + 3 days
      await client.execute(
        `INSERT INTO demo_leads (full_name, last_name, email, phone, privacy_accepted, lead_type, pensione_name, message, token, activation_link, expires_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY))`,
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
      const rows = await client.query("SELECT * FROM demo_leads WHERE id = ?", [id]);
      return new Response(JSON.stringify({ success: true, data: rows[0] || null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_by_token") {
      const { token } = params;
      
      // First, find the lead by token
      const rows = await client.query("SELECT * FROM demo_leads WHERE token = ?", [token]);
      
      if (!rows.length) {
        return new Response(JSON.stringify({ status: "not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const lead = rows[0] as any;
      
      // Check if expired
      if (lead.expires_at && new Date(lead.expires_at) < new Date()) {
        return new Response(JSON.stringify({ status: "expired", data: lead }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // If not yet confirmed, confirm now
      if (!lead.confirmed) {
        await client.execute(
          "UPDATE demo_leads SET confirmed = 1, confirmed_at = NOW() WHERE token = ?",
          [token]
        );
      }
      
      const wasAlready = lead.confirmed === 1;
      return new Response(JSON.stringify({ status: "confirmed", was_already_confirmed: wasAlready, data: lead }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "insert_invite") {
      const { client_id, tenant_id, email, first_name, last_name, user_id, recovery_link } = params;
      await client.execute(
        `INSERT INTO client_invites (client_id, tenant_id, email, first_name, last_name, user_id, recovery_link, activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [client_id, tenant_id, email, first_name || null, last_name || null, user_id || null, recovery_link || null]
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate_invite") {
      const { client_id } = params;
      await client.execute(
        `UPDATE client_invites SET activated = 1 WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`,
        [client_id]
      );
      return new Response(JSON.stringify({ success: true }), {
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
