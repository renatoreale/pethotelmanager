-- BLOCCO 23 — Staff e permessi: "la sicurezza non deve essere solo
-- frontend". Le policy attuali su payments/documents ("Tenant staff manage
-- ...") permettono scrittura/cancellazione a QUALSIASI utente del tenant,
-- indipendentemente dal ruolo — mentre il modello di permessi lato
-- frontend (usePermissions.ts) prevede che ruoli come "ceo" siano di sola
-- lettura e "operatore" non possa toccare i pagamenti. Oggi questo non è
-- garantito lato database: una chiamata diretta alle API bypassa il
-- controllo. Allineiamo le RLS al modello già in vigore, stesso pattern
-- già usato per price_lists (has_role invece di un controllo aperto sul
-- solo tenant_id). La SELECT resta invariata (lettura ancora aperta a
-- tutto il tenant): si restringe solo scrittura/cancellazione.
DROP POLICY IF EXISTS "Tenant staff manage payments" ON public.payments;
CREATE POLICY "Tenant staff manage payments" ON public.payments
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
  );

DROP POLICY IF EXISTS "Tenant staff manage documents" ON public.documents;
CREATE POLICY "Tenant staff manage documents" ON public.documents
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'operatore'::app_role)))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'operatore'::app_role)))
  );
