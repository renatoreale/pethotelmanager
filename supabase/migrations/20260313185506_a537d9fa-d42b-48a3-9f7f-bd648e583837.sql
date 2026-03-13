
ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_tenant_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.user_roles
  DROP CONSTRAINT user_roles_tenant_id_fkey;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.trial_registrations
  DROP CONSTRAINT trial_registrations_tenant_id_fkey;

ALTER TABLE public.trial_registrations
  ADD CONSTRAINT trial_registrations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
