-- Update tenants RLS policy to allow users to see all tenants they're associated with
DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users see associated tenants" ON public.tenants;

CREATE POLICY "Users see associated tenants" ON public.tenants
FOR SELECT
TO authenticated
USING (
  id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);