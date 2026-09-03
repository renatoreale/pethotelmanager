-- ============================================================
-- Fase 4: alla conversione, l'utente può scegliere di mantenere
-- o eliminare i dati usati durante la prova.
--
-- Additiva: due nuove colonne nullable su purchase_requests,
-- nessuna riga esistente cambia stato. Se rimangono NULL (come
-- per ogni richiesta creata prima di questa migration, o per un
-- acquisto anonimo dalla landing senza trial attivo) il comporta-
-- mento di activate-purchase resta quello di oggi: crea sempre
-- un tenant nuovo.
-- ============================================================

ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS keep_trial_data boolean,
  ADD COLUMN IF NOT EXISTS trial_tenant_id uuid REFERENCES public.tenants(id);
