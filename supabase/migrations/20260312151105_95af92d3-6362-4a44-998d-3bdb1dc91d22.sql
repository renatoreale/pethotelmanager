
-- Allow clients to check if their tenant has a Stripe key (only id column, not the key itself)
CREATE POLICY "tenant_stripe_keys_client_check" ON public.tenant_stripe_keys
  FOR SELECT TO authenticated
  USING (
    public.is_client(auth.uid())
    AND tenant_id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
  );
