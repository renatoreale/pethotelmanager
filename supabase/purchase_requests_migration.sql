-- Migration: purchase_requests table
-- Run this on DEV (bshsppbcgvmjyellozbb) and PROD (idkzlnzvqzqvkdchchnz)

CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  nome_pensione TEXT NOT NULL,
  citta_pensione TEXT NOT NULL,
  partita_iva TEXT NOT NULL,
  piano TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Solo gli admin autenticati possono leggere/gestire le richieste
CREATE POLICY "admin_purchase_requests" ON purchase_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
