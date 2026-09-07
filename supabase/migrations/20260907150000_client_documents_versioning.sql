-- BLOCCO 9 (addendum) — Documenti del cliente con versione (privacy, regolamento).
--
-- "Privacy" e "regolamento" sono documenti legati al CLIENTE (non a un pet o
-- a un soggiorno) e raccolti una tantum — ma il testo del regolamento o
-- dell'informativa privacy può cambiare nel tempo, quindi serve sapere
-- quale versione ha firmato un cliente rispetto a quella attualmente in
-- vigore per la pensione.
--
-- Impatto: additivo, nessun record esistente viene toccato.
-- - documents.client_id (nullable): aggancia un documento al cliente,
--   in alternativa a booking_id/cat_id (usati per i documenti di soggiorno).
-- - documents.document_version (nullable, testo libero, es. "v2 — gennaio
--   2026"): la versione indicata dallo staff al momento del caricamento.
-- - Il CHECK constraint su document_type viene esteso con 'privacy' e
--   'regolamento' (DROP+ADD: sicuro, amplia soltanto i valori ammessi).
-- - tenants.regolamento_version / tenants.privacy_version (nullable): la
--   versione "corrente" impostata dal titolare in Pensione → Impostazioni
--   quando aggiorna il testo del documento. Confrontata con
--   documents.document_version permette di segnalare in UI i clienti che
--   hanno firmato una versione superata.

ALTER TABLE public.documents
  ADD COLUMN client_id UUID REFERENCES public.clients(id),
  ADD COLUMN document_version TEXT;

CREATE INDEX idx_documents_client_id ON public.documents(client_id);

ALTER TABLE public.documents
  DROP CONSTRAINT documents_document_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'libretto_vaccinazioni', 'certificato_sanitario', 'modulo_affido',
    'documento_identita', 'privacy', 'regolamento', 'altro'
  ));

ALTER TABLE public.tenants
  ADD COLUMN regolamento_version TEXT,
  ADD COLUMN privacy_version TEXT;
