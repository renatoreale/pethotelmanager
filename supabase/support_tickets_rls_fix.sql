-- Fix RLS policies per support_tickets e support_ticket_messages
-- Il problema era: profiles usa "user_id" come FK, non "id"
-- Usiamo get_user_tenant_id() e has_role() già presenti nel progetto

-- ── Rimuovi policy errate ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "tenant_read_own_tickets"              ON support_tickets;
DROP POLICY IF EXISTS "tenant_insert_ticket"                 ON support_tickets;
DROP POLICY IF EXISTS "admin_update_ticket"                  ON support_tickets;
DROP POLICY IF EXISTS "read_messages_if_ticket_readable"     ON support_ticket_messages;
DROP POLICY IF EXISTS "insert_message_if_ticket_readable"    ON support_ticket_messages;

-- ── support_tickets ────────────────────────────────────────────────────────

CREATE POLICY "tenant_read_own_tickets" ON support_tickets
  FOR SELECT USING (
    tenant_id = get_user_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'ceo')
  );

CREATE POLICY "tenant_insert_ticket" ON support_tickets
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "admin_update_ticket" ON support_tickets
  FOR UPDATE USING (
    tenant_id = get_user_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'ceo')
  );

-- ── support_ticket_messages ────────────────────────────────────────────────

CREATE POLICY "read_messages_if_ticket_readable" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.tenant_id = get_user_tenant_id(auth.uid())
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'ceo')
      )
    )
  );

CREATE POLICY "insert_message_if_ticket_readable" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.tenant_id = get_user_tenant_id(auth.uid())
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'ceo')
      )
    )
  );
