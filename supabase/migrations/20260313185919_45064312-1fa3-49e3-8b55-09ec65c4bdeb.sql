
-- Enable RLS on tenants if not already
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tenants
CREATE POLICY "Authenticated users read tenants"
ON public.tenants FOR SELECT TO authenticated
USING (true);

-- Only admin can insert tenants
CREATE POLICY "Admin insert tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin and titolare/manager of the tenant can update
CREATE POLICY "Admin or titolare update tenants"
ON public.tenants FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
);

-- Only admin can delete tenants
CREATE POLICY "Admin delete tenants"
ON public.tenants FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
