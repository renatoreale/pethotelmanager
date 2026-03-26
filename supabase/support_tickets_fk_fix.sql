-- Fix: aggiungi FK da support_tickets.created_by → profiles(user_id)
-- e da support_ticket_messages.author_id → profiles(user_id)
-- Necessario perché PostgREST non può attraversare lo schema auth,
-- quindi il join profiles!created_by falliva silenziosamente.

-- ── support_tickets.created_by ────────────────────────────────────────────────

-- Rimuovi il vecchio FK verso auth.users (nome generato automaticamente da Postgres)
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_created_by_fkey;

-- Aggiungi FK verso profiles(user_id) — PostgREST usa questo per il join
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- ── support_ticket_messages.author_id ────────────────────────────────────────

ALTER TABLE public.support_ticket_messages
  DROP CONSTRAINT IF EXISTS support_ticket_messages_author_id_fkey;

ALTER TABLE public.support_ticket_messages
  ADD CONSTRAINT support_ticket_messages_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
