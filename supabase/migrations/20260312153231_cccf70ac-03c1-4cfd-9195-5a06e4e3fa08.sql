
-- Allow clients to read payment_split_configs for their tenant
CREATE POLICY "Clients read tenant payment_split_configs"
ON public.payment_split_configs
FOR SELECT
TO authenticated
USING (
  public.is_client(auth.uid())
  AND tenant_id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
);
