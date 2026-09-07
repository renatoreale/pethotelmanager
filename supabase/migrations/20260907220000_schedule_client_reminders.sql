-- Automazioni — promemoria email automatici ai clienti (Blocco 13).
--
-- Nuovo job pg_cron giornaliero (stesso modello già in uso per
-- trial-nurture-emails-daily / cleanup-expired-diario-daily) che invoca la
-- nuova edge function send-client-reminders. Ogni giorno, una sola volta
-- per prenotazione (tracciato su email_log per evitare invii duplicati se
-- il cron gira più volte o fallisce a metà), vengono inviati:
--   - promemoria check-in il giorno prima dell'arrivo;
--   - promemoria check-out il giorno prima della partenza;
--   - promemoria documenti mancanti (libretto vaccinazioni, modulo di
--     affido) 3 giorni prima dell'arrivo, solo se effettivamente mancano;
--   - sollecito saldo, se il soggiorno è concluso e resta un importo aperto.
--
-- Impatto: additivo, nessuna tabella esistente modificata.

SELECT cron.schedule(
  'client-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://idkzlnzvqzqvkdchchnz.supabase.co/functions/v1/send-client-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
