
-- Indici compositi per ottimizzare le query multi-tenant sulle tabelle principali

-- bookings: query per tenant + status, date
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON public.bookings (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_checkin ON public.bookings (tenant_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_checkout ON public.bookings (tenant_id, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_client ON public.bookings (tenant_id, client_id);

-- cats: query per tenant + client
CREATE INDEX IF NOT EXISTS idx_cats_tenant_client ON public.cats (tenant_id, client_id);

-- clients: query per tenant + ricerche nome
CREATE INDEX IF NOT EXISTS idx_clients_tenant_lastname ON public.clients (tenant_id, last_name);

-- booking_cats: query per booking
CREATE INDEX IF NOT EXISTS idx_booking_cats_booking ON public.booking_cats (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_cats_cat ON public.booking_cats (cat_id);

-- payments: query per tenant + booking
CREATE INDEX IF NOT EXISTS idx_payments_tenant_booking ON public.payments (tenant_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON public.payments (tenant_id, payment_date);

-- cat_registry: query per tenant + date
CREATE INDEX IF NOT EXISTS idx_cat_registry_tenant_checkin ON public.cat_registry (tenant_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_cat_registry_tenant_booking ON public.cat_registry (tenant_id, booking_id);

-- appointments: query per tenant + data
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_scheduled ON public.appointments (tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_booking ON public.appointments (tenant_id, booking_id);

-- planning_tasks: query per tenant + data
CREATE INDEX IF NOT EXISTS idx_planning_tasks_tenant_date ON public.planning_tasks (tenant_id, task_date);

-- audit_log: query per tenant + tabella
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_table ON public.audit_log (tenant_id, table_name);

-- cage_overrides: query per tenant + data
CREATE INDEX IF NOT EXISTS idx_cage_overrides_tenant_date ON public.cage_overrides (tenant_id, override_date);

-- documents: query per tenant + booking
CREATE INDEX IF NOT EXISTS idx_documents_tenant_booking ON public.documents (tenant_id, booking_id);

-- profiles: lookup veloce per user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);

-- user_roles: lookup veloce
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles (user_id, tenant_id);
