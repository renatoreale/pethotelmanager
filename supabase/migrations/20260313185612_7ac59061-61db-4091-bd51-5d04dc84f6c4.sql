
-- slot_configs
ALTER TABLE public.slot_configs DROP CONSTRAINT slot_configs_tenant_id_fkey;
ALTER TABLE public.slot_configs ADD CONSTRAINT slot_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- appointments
ALTER TABLE public.appointments DROP CONSTRAINT appointments_tenant_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- bookings
ALTER TABLE public.bookings DROP CONSTRAINT bookings_tenant_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- booking_counters
ALTER TABLE public.booking_counters DROP CONSTRAINT booking_counters_tenant_id_fkey;
ALTER TABLE public.booking_counters ADD CONSTRAINT booking_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- cage_overrides
ALTER TABLE public.cage_overrides DROP CONSTRAINT cage_overrides_tenant_id_fkey;
ALTER TABLE public.cage_overrides ADD CONSTRAINT cage_overrides_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- cancellation_policies
ALTER TABLE public.cancellation_policies DROP CONSTRAINT cancellation_policies_tenant_id_fkey;
ALTER TABLE public.cancellation_policies ADD CONSTRAINT cancellation_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- cat_registry
ALTER TABLE public.cat_registry DROP CONSTRAINT cat_registry_tenant_id_fkey;
ALTER TABLE public.cat_registry ADD CONSTRAINT cat_registry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- cats
ALTER TABLE public.cats DROP CONSTRAINT cats_tenant_id_fkey;
ALTER TABLE public.cats ADD CONSTRAINT cats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- clients
ALTER TABLE public.clients DROP CONSTRAINT clients_tenant_id_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- documents
ALTER TABLE public.documents DROP CONSTRAINT documents_tenant_id_fkey;
ALTER TABLE public.documents ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- email_log
ALTER TABLE public.email_log DROP CONSTRAINT email_log_tenant_id_fkey;
ALTER TABLE public.email_log ADD CONSTRAINT email_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- payment_methods
ALTER TABLE public.payment_methods DROP CONSTRAINT payment_methods_tenant_id_fkey;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- payment_split_configs
ALTER TABLE public.payment_split_configs DROP CONSTRAINT payment_split_configs_tenant_id_fkey;
ALTER TABLE public.payment_split_configs ADD CONSTRAINT payment_split_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- payments
ALTER TABLE public.payments DROP CONSTRAINT payments_tenant_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- planning_tasks
ALTER TABLE public.planning_tasks DROP CONSTRAINT planning_tasks_tenant_id_fkey;
ALTER TABLE public.planning_tasks ADD CONSTRAINT planning_tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- price_lists
ALTER TABLE public.price_lists DROP CONSTRAINT price_lists_tenant_id_fkey;
ALTER TABLE public.price_lists ADD CONSTRAINT price_lists_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- quote_requests
ALTER TABLE public.quote_requests DROP CONSTRAINT quote_requests_tenant_id_fkey;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- role_permissions
ALTER TABLE public.role_permissions DROP CONSTRAINT role_permissions_tenant_id_fkey;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- tenant_stripe_keys
ALTER TABLE public.tenant_stripe_keys DROP CONSTRAINT tenant_stripe_keys_tenant_id_fkey;
ALTER TABLE public.tenant_stripe_keys ADD CONSTRAINT tenant_stripe_keys_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- audit_log
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_tenant_id_fkey;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
