-- Blocco 15 (estensione) — template email personalizzabili per ciascuna
-- automazione, stesso pattern già in uso per preventivo_email_subject/body
-- e appuntamento_email_subject/body: colonne di testo nullable, se non
-- impostate l'edge function usa un template predefinito.
--
-- Impatto: additivo, tutte le colonne nullable — nessun comportamento
-- esistente cambia finché il titolare non personalizza un template.

ALTER TABLE public.tenants
  ADD COLUMN automation_upcoming_stay_subject text,
  ADD COLUMN automation_upcoming_stay_body text,
  ADD COLUMN automation_documents_subject text,
  ADD COLUMN automation_documents_body text,
  ADD COLUMN automation_checkin_subject text,
  ADD COLUMN automation_checkin_body text,
  ADD COLUMN automation_checkout_subject text,
  ADD COLUMN automation_checkout_body text,
  ADD COLUMN automation_checkout_summary_subject text,
  ADD COLUMN automation_checkout_summary_body text,
  ADD COLUMN automation_balance_subject text,
  ADD COLUMN automation_balance_body text,
  ADD COLUMN automation_review_request_subject text,
  ADD COLUMN automation_review_request_body text,
  ADD COLUMN automation_winback_subject text,
  ADD COLUMN automation_winback_body text;
