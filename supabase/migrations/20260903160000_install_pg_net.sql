-- I cron job pg_cron per le funzioni schedulate (nurture email, pulizia
-- trial scaduti) chiamano un'estensione HTTP mai installata sul progetto
-- ("extensions.http_post" non esiste). Installiamo pg_net, che fornisce
-- la funzione http_post(url, headers, body) già usata nei comandi.
CREATE EXTENSION IF NOT EXISTS pg_net;
