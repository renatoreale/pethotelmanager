-- Blocco 15 — Automazioni predefinite configurabili per pensione.
--
-- Il pannello super admin controlla già un interruttore master
-- (tenants.client_reminders_enabled) per l'intera automazione email:
-- resta com'è, come freno di emergenza cross-tenant.
--
-- Questo blocco aggiunge un secondo livello, in mano al titolare della
-- singola pensione (sezione "Automazioni" in Impostazioni Pensione):
-- ciascuna automazione predefinita si accende/spegne singolarmente,
-- default OFF per tutte finché il titolare non la attiva consapevolmente.
-- Entrambi gli interruttori devono essere accesi perché un'email parta.
--
-- automation_upcoming_stay_reminder_enabled  -> 7 giorni prima
-- automation_documents_reminder_enabled      -> 3 giorni prima (già esistente)
-- automation_checkin_reminder_enabled        -> 1 giorno prima check-in (già esistente)
-- automation_checkout_reminder_enabled       -> 1 giorno prima check-out (già esistente)
-- automation_checkout_summary_enabled        -> il giorno del check-out: riepilogo + saldo
-- automation_balance_reminder_enabled        -> saldo scaduto (già esistente)
-- automation_review_request_enabled          -> 1 giorno dopo: richiesta recensione
-- automation_winback_enabled                 -> 30/60/90 giorni dopo: invito a tornare
--
-- review_url: link (es. Google Maps) usato dalla richiesta di recensione;
-- se non impostato quell'automazione non invia nulla (nessun senso a
-- chiedere una recensione senza un posto dove lasciarla).
--
-- Impatto: additivo, tutte le nuove colonne booleane default false e
-- review_url nullable — nessun tenant riceve automazioni nuove finché il
-- titolare non le attiva esplicitamente.

ALTER TABLE public.tenants
  ADD COLUMN review_url text,
  ADD COLUMN automation_upcoming_stay_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_documents_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_checkin_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_checkout_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_checkout_summary_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_balance_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_review_request_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN automation_winback_enabled boolean NOT NULL DEFAULT false;
