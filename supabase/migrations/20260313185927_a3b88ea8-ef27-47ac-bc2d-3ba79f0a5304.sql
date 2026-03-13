
-- Fix: user_roles with tenant_id NULL (like admin) should not be affected by tenant deletion
-- Change CASCADE back to SET NULL for user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_tenant_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
