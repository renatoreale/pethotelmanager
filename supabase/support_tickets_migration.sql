-- ── SUPPORT TICKETS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('tecnico','fatturazione','configurazione','altro')),
  priority    TEXT NOT NULL DEFAULT 'normale' CHECK (priority IN ('bassa','normale','alta','urgente')),
  status      TEXT NOT NULL DEFAULT 'aperto' CHECK (status IN ('aperto','in_lavorazione','risolto','chiuso')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id        UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  is_support_reply BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_updated_at
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: tenant users can read/write their own; admin/ceo see all
CREATE POLICY "tenant_read_own_tickets" ON support_tickets
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','ceo')
    )
  );

CREATE POLICY "tenant_insert_ticket" ON support_tickets
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "admin_update_ticket" ON support_tickets
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','ceo')
    )
  );

-- Messages: readable if ticket is readable
CREATE POLICY "read_messages_if_ticket_readable" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','ceo'))
      )
    )
  );

CREATE POLICY "insert_message_if_ticket_readable" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','ceo'))
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
