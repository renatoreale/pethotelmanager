
-- Fix audit_log INSERT policy to restrict to tenant members
DROP POLICY "System inserts audit_log" ON public.audit_log;

CREATE POLICY "Authenticated users insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    OR public.has_role(auth.uid(), 'admin')
    OR tenant_id IS NULL
  );
