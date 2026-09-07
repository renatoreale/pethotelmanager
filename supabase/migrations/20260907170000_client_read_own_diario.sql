-- Portale cliente — Diario (sola lettura).
--
-- Il diario (Blocco 8) era finora visibile solo allo staff: le policy
-- esistenti su diario_entries si basano su get_user_tenant_id(auth.uid()),
-- che per una sessione cliente (autenticata via clients.user_id, non via
-- profiles/user_roles) restituisce sempre NULL — quindi un cliente non
-- potrebbe mai vedere gli aggiornamenti pubblicati sul proprio pet.
--
-- Questa policy segue esattamente lo stesso pattern già in uso per
-- "Clients read own cats" (is_client + get_client_id, entrambe funzioni
-- già esistenti): un cliente autenticato può leggere le voci di diario
-- dei SOLI pet di sua proprietà, in sola lettura (nessuna policy di
-- scrittura per i clienti: pubblicare/eliminare resta riservato allo staff).
--
-- Impatto: additiva, nessuna policy esistente viene modificata o rimossa.

CREATE POLICY "Clients read own pet diario" ON public.diario_entries
  FOR SELECT TO authenticated
  USING (
    public.is_client(auth.uid())
    AND cat_id IN (SELECT id FROM public.cats WHERE client_id = public.get_client_id(auth.uid()))
  );
