-- pg_net installa le sue funzioni nello schema "net" indipendentemente da
-- "WITH SCHEMA" (verificato in produzione): sia il job esistente
-- "trial-nurture-emails-daily" (che infatti falliva ad ogni esecuzione,
-- 28 volte su 28, da quando era stato creato) sia il nuovo
-- "cleanup-expired-trials-daily" (introdotto in 20260903150000, con la
-- stessa svista) vanno corretti per chiamare net.http_post invece di
-- extensions.http_post, che non è mai esistita.
select cron.schedule(
  'trial-nurture-emails-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://idkzlnzvqzqvkdchchnz.supabase.co/functions/v1/send-trial-nurture-emails',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'cleanup-expired-trials-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://idkzlnzvqzqvkdchchnz.supabase.co/functions/v1/cleanup-expired-trials',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
