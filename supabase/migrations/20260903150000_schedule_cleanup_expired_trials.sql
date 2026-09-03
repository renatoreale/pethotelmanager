-- Schedula la pulizia dei trial scaduti (Fase 3), con lo stesso meccanismo
-- già in uso per l'invio delle email di nurture (pg_cron + http_post, vedi
-- il job "trial-nurture-emails-daily" impostato direttamente sul progetto).
-- La function stessa è no-op se new_trial_flow_enabled è spento e applica
-- tutti i controlli di sicurezza descritti in cleanup-expired-trials
-- (mai un tenant che non sia inequivocabilmente una pensione di prova
-- dedicata, mai "la-zampa-felice", mai un tenant condiviso da più trial).
select cron.schedule(
  'cleanup-expired-trials-daily',
  '0 5 * * *',
  $$
  select extensions.http_post(
    url := 'https://idkzlnzvqzqvkdchchnz.supabase.co/functions/v1/cleanup-expired-trials',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
