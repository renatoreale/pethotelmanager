
-- =============================================
-- CATHOTEL MULTI-TENANT SCHEMA
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'ceo', 'titolare', 'manager', 'operatore');
CREATE TYPE public.booking_status AS ENUM ('preventivo', 'confermata', 'check_in', 'in_corso', 'check_out', 'chiusa', 'cancellata', 'rimborsata', 'scaduto');
CREATE TYPE public.payment_type AS ENUM ('caparra', 'saldo', 'extra', 'rimborso');
CREATE TYPE public.cage_pool_type AS ENUM ('singola', 'doppia');
CREATE TYPE public.audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'RESTORE');
CREATE TYPE public.email_status AS ENUM ('queued', 'sent', 'failed');
CREATE TYPE public.appointment_type AS ENUM ('check_in', 'check_out');

-- 2. UTILITY FUNCTION: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. TENANTS
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  num_singole INTEGER NOT NULL DEFAULT 0,
  num_doppie INTEGER NOT NULL DEFAULT 0,
  occupancy_rule_days INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 4. PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. USER ROLES (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  UNIQUE (user_id, role, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY DEFINER: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. SECURITY DEFINER: get_user_tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 8. CLIENTS (tenant-scoped)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  fiscal_code TEXT,
  address TEXT,
  notes TEXT,
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 9. CATS (tenant-scoped)
CREATE TABLE public.cats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  color TEXT,
  birth_date DATE,
  gender TEXT,
  microchip TEXT,
  weight_kg NUMERIC(5,2),
  is_neutered BOOLEAN DEFAULT false,
  medical_notes TEXT,
  dietary_notes TEXT,
  behavioral_notes TEXT,
  needs_double_cage BOOLEAN NOT NULL DEFAULT false,
  sibling_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;

-- 10. BOOKINGS (tenant-scoped)
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  booking_number TEXT NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'preventivo',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  cage_pool_type public.cage_pool_type NOT NULL DEFAULT 'singola',
  units_occupied INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) DEFAULT 0,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 11. BOOKING_CATS (many-to-many)
CREATE TABLE public.booking_cats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  cat_id UUID NOT NULL REFERENCES public.cats(id),
  UNIQUE (booking_id, cat_id)
);
ALTER TABLE public.booking_cats ENABLE ROW LEVEL SECURITY;

-- 12. PAYMENTS (tenant-scoped)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  payment_type public.payment_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 13. SLOT CONFIG (tenant-scoped)
CREATE TABLE public.slot_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_appointments INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_configs ENABLE ROW LEVEL SECURITY;

-- 14. APPOINTMENTS (tenant-scoped)
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  appointment_type public.appointment_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 15. CAGE OVERRIDES / FORZATURE (tenant-scoped)
CREATE TABLE public.cage_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  cage_pool_type public.cage_pool_type NOT NULL,
  override_date DATE NOT NULL,
  capacity_change INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cage_overrides ENABLE ROW LEVEL SECURITY;

-- 16. PRICE LIST (global + tenant override)
CREATE TABLE public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  cage_pool_type public.cage_pool_type NOT NULL,
  price_per_day NUMERIC(10,2) NOT NULL,
  extra_cat_supplement NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

-- 17. PLANNING TASKS (tenant-scoped)
CREATE TABLE public.planning_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  task_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planning_tasks ENABLE ROW LEVEL SECURITY;

-- 18. EMAIL TEMPLATES (global, admin-only editable)
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 19. EMAIL LOG (tenant-scoped)
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  template_id UUID REFERENCES public.email_templates(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status public.email_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- 20. DOCUMENTS / PDF STORAGE (tenant-scoped)
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  booking_id UUID REFERENCES public.bookings(id),
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT DEFAULT 'application/pdf',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 21. AUDIT LOG (append-only, global with tenant context)
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation public.audit_operation NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- TENANTS: authenticated users see their own tenant, admins see all
CREATE POLICY "Users see own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System inserts profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- USER ROLES
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'titolare'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'titolare'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'titolare'));

-- TENANT-SCOPED TABLES: same pattern for clients, cats, bookings, etc.
-- Users in the same tenant can read; titolare/manager/admin can write.

-- CLIENTS
CREATE POLICY "Tenant users see clients" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- CATS
CREATE POLICY "Tenant users see cats" ON public.cats
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage cats" ON public.cats
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- BOOKINGS
CREATE POLICY "Tenant users see bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage bookings" ON public.bookings
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- BOOKING_CATS
CREATE POLICY "Tenant users see booking_cats" ON public.booking_cats
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Tenant staff manage booking_cats" ON public.booking_cats
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin')))
  );

-- PAYMENTS
CREATE POLICY "Tenant users see payments" ON public.payments
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- SLOT_CONFIGS
CREATE POLICY "Tenant users see slot_configs" ON public.slot_configs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Titolare/admin manage slot_configs" ON public.slot_configs
  FOR ALL TO authenticated
  USING (
    (tenant_id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (tenant_id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
    OR public.has_role(auth.uid(), 'admin')
  );

-- APPOINTMENTS
CREATE POLICY "Tenant users see appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- CAGE_OVERRIDES
CREATE POLICY "Tenant users see cage_overrides" ON public.cage_overrides
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Titolare/admin manage cage_overrides" ON public.cage_overrides
  FOR ALL TO authenticated
  USING (
    (tenant_id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (tenant_id = public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(), 'titolare') OR public.has_role(auth.uid(), 'manager')))
    OR public.has_role(auth.uid(), 'admin')
  );

-- PRICE_LISTS (global when tenant_id is null, tenant-specific otherwise)
CREATE POLICY "Anyone sees price_lists" ON public.price_lists
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages price_lists" ON public.price_lists
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'titolare')))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'titolare')));

-- PLANNING_TASKS
CREATE POLICY "Tenant users see planning_tasks" ON public.planning_tasks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage planning_tasks" ON public.planning_tasks
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- EMAIL_TEMPLATES (read all, write admin only)
CREATE POLICY "Anyone reads email_templates" ON public.email_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manages email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- EMAIL_LOG
CREATE POLICY "Tenant users see email_log" ON public.email_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff insert email_log" ON public.email_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- DOCUMENTS
CREATE POLICY "Tenant users see documents" ON public.documents
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- AUDIT_LOG (read by tenant members / admin, insert by system)
CREATE POLICY "Tenant users see audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cats_updated_at BEFORE UPDATE ON public.cats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_slot_configs_updated_at BEFORE UPDATE ON public.slot_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON public.price_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_tasks_updated_at BEFORE UPDATE ON public.planning_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PROFILE AUTO-CREATION TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_cats_tenant ON public.cats(tenant_id);
CREATE INDEX idx_cats_client ON public.cats(client_id);
CREATE INDEX idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_booking ON public.appointments(booking_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);
CREATE INDEX idx_cage_overrides_tenant_date ON public.cage_overrides(tenant_id, override_date);
CREATE INDEX idx_planning_tasks_tenant_date ON public.planning_tasks(tenant_id, task_date);
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX idx_email_log_tenant ON public.email_log(tenant_id);
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_booking ON public.documents(booking_id);
