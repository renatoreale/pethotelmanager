-- Permette a titolare/manager di aggiornare i dati della propria pensione (tabella tenants).
-- Finora solo l'admin globale poteva scrivere su tenants: la scrittura falliva in
-- modo silenzioso (0 righe aggiornate, nessun errore) per titolare/manager.
DROP POLICY IF EXISTS "Titolare/manager update own tenant" ON public.tenants;

CREATE POLICY "Titolare/manager update own tenant" ON public.tenants
FOR UPDATE TO authenticated
USING (id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))
WITH CHECK (id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')));
