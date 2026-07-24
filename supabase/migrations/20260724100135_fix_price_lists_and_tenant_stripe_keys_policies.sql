-- Aggiunge manager alla policy di scrittura di price_lists (era solo titolare/admin).
DROP POLICY IF EXISTS "Admin manages price_lists" ON public.price_lists;

CREATE POLICY "Admin manages price_lists" ON public.price_lists
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))
);

-- tenant_stripe_keys aveva solo una policy di lettura: nessuno (nemmeno admin) poteva
-- inserire/aggiornare la chiave Stripe della pensione. Aggiunge scrittura per
-- titolare/manager sul proprio tenant + admin, stesso pattern di payment_methods.
DROP POLICY IF EXISTS "Titolare/admin manage tenant_stripe_keys" ON public.tenant_stripe_keys;

CREATE POLICY "Titolare/admin manage tenant_stripe_keys" ON public.tenant_stripe_keys
FOR ALL TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))
  OR has_role(auth.uid(), 'admin')
);
