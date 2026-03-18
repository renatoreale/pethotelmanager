ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read role_permissions" ON public.role_permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage role_permissions" ON public.role_permissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
