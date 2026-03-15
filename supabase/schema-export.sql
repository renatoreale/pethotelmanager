-- ============================================================
-- PetHotelManager - Full Schema Export
-- Generated: 2026-03-15
-- Run this script in the SQL Editor of a new Supabase project
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'ceo', 'titolare', 'manager', 'operatore');
CREATE TYPE public.appointment_type AS ENUM ('check_in', 'check_out');
CREATE TYPE public.audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'RESTORE');
CREATE TYPE public.booking_status AS ENUM (
  'preventivo', 'confermata', 'appuntamento_fissato',
  'check_in', 'in_corso', 'check_out', 'chiusa',
  'cancellata', 'rimborsata', 'scaduto',
  'appuntamento_in_fissato', 'appuntamento_out_fissato', 'appuntamento_in_out_fissato'
);
CREATE TYPE public.cage_pool_type AS ENUM ('singola', 'doppia');
CREATE TYPE public.email_status AS ENUM ('queued', 'sent', 'failed');
CREATE TYPE public.payment_type AS ENUM ('caparra', 'saldo', 'extra', 'rimborso', 'manuale', 'gestione_pratica');
CREATE TYPE public.pet_type AS ENUM ('gatti', 'cani', 'entrambi');
CREATE TYPE public.tariff_type AS ENUM ('stagionale', 'extra_giornaliero', 'extra_km', 'extra_una_tantum');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  locale text NOT NULL DEFAULT 'it',
  pet_type public.pet_type NOT NULL DEFAULT 'gatti',
  address text,
  cap text,
  city text,
  phone text,
  email text,
  pec text,
  partita_iva text,
  titolare_name text,
  logo_url text,
  iban text,
  iban_holder text,
  bank_name text,
  max_cats integer NOT NULL DEFAULT 20,
  num_singole integer NOT NULL DEFAULT 10,
  num_doppie integer NOT NULL DEFAULT 5,
  num_singole_cani integer NOT NULL DEFAULT 0,
  num_doppie_cani integer NOT NULL DEFAULT 0,
  num_singole_gatti integer NOT NULL DEFAULT 0,
  num_doppie_gatti integer NOT NULL DEFAULT 0,
  occupancy_rule_days integer NOT NULL DEFAULT 30,
  count_checkin_day boolean NOT NULL DEFAULT true,
  count_checkout_day boolean NOT NULL DEFAULT false,
  stay_calc_type text NOT NULL DEFAULT 'notti',
  bollo_amount numeric NOT NULL DEFAULT 0,
  preventivo_validity_days integer NOT NULL DEFAULT 7,
  preventivo_footer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id)
);

-- clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  fiscal_code text,
  address text,
  notes text,
  is_blacklisted boolean NOT NULL DEFAULT false,
  blacklist_reason text,
  portal_activated boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- cats
CREATE TABLE public.cats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  name text NOT NULL,
  breed text,
  gender text,
  color text,
  birth_date date,
  weight_kg numeric,
  microchip text,
  is_neutered boolean DEFAULT false,
  needs_double_cage boolean NOT NULL DEFAULT false,
  sibling_group_id uuid,
  photo_url text,
  pet_type public.pet_type,
  medical_notes text,
  dietary_notes text,
  behavioral_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  booking_number text NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'preventivo',
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  cage_pool_type public.cage_pool_type NOT NULL DEFAULT 'singola',
  units_occupied integer NOT NULL DEFAULT 1,
  total_amount numeric DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  price_breakdown jsonb,
  pet_type public.pet_type,
  notes text,
  quote_request_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- booking_cats
CREATE TABLE public.booking_cats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  cat_id uuid NOT NULL REFERENCES public.cats(id)
);

-- booking_counters
CREATE TABLE public.booking_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  year smallint NOT NULL,
  last_counter integer NOT NULL DEFAULT 99,
  PRIMARY KEY (tenant_id, year)
);

-- appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  appointment_type public.appointment_type NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  confirmed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  payment_type public.payment_type NOT NULL,
  amount numeric NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  method text,
  payment_method_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- payment_methods
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from payments to payment_methods
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_id_fkey
  FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id);

-- payment_split_configs
CREATE TABLE public.payment_split_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  label text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  payment_moment text NOT NULL DEFAULT 'caparra',
  payment_method_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- cat_registry
CREATE TABLE public.cat_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  cat_id uuid NOT NULL REFERENCES public.cats(id),
  client_name text NOT NULL,
  cat_name text NOT NULL,
  microchip text,
  check_in_date date NOT NULL,
  check_out_date date,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- cage_overrides
CREATE TABLE public.cage_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  override_date date NOT NULL,
  cage_pool_type public.cage_pool_type NOT NULL,
  capacity_change integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- cancellation_policies
CREATE TABLE public.cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) UNIQUE,
  admin_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- cancellation_policy_rules
CREATE TABLE public.cancellation_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.cancellation_policies(id),
  days_before_checkin integer NOT NULL,
  refund_percentage numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- price_lists
CREATE TABLE public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  tariff_type public.tariff_type NOT NULL DEFAULT 'stagionale',
  season text,
  price_per_day numeric NOT NULL DEFAULT 0,
  extra_cat_supplement numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  fixed_cost numeric DEFAULT 0,
  included_km numeric DEFAULT 0,
  extra_km_cost numeric DEFAULT 0,
  cage_pool_type public.cage_pool_type,
  pet_type public.pet_type,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- slot_configs
CREATE TABLE public.slot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30,
  max_appointments integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  appointment_type text NOT NULL DEFAULT 'check_in',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- quote_requests
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  num_pets integer NOT NULL DEFAULT 1,
  pet_names text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from bookings to quote_requests
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_quote_request_id_fkey
  FOREIGN KEY (quote_request_id) REFERENCES public.quote_requests(id);

-- audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  table_name text NOT NULL,
  operation public.audit_operation NOT NULL,
  record_id uuid NOT NULL,
  user_id uuid,
  user_role text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid REFERENCES public.bookings(id),
  document_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text DEFAULT 'application/pdf',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- planning_tasks
CREATE TABLE public.planning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  title text NOT NULL,
  description text,
  task_date date NOT NULL,
  assigned_to uuid,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- role_permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  role public.app_role NOT NULL,
  resource text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- demo_leads
CREATE TABLE public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  phone text,
  pensione_name text,
  message text,
  lead_type text NOT NULL DEFAULT 'prova_gratuita',
  privacy_accepted boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- landing_config
CREATE TABLE public.landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title text NOT NULL DEFAULT 'CatHotel Manager',
  hero_subtitle text NOT NULL DEFAULT 'Il gestionale completo per la tua pensione per animali',
  hero_description text NOT NULL DEFAULT 'Gestisci prenotazioni, pagamenti, clienti e animali in un unico posto. Provalo gratis!',
  cta_text text NOT NULL DEFAULT 'Inizia la prova gratuita',
  show_trial_banner boolean NOT NULL DEFAULT true,
  trial_days integer NOT NULL DEFAULT 14,
  base_plan_price_yearly numeric NOT NULL DEFAULT 290,
  pro_plan_price_yearly numeric NOT NULL DEFAULT 490,
  base_plan_features jsonb NOT NULL DEFAULT '["Gestione prenotazioni", "Calendario appuntamenti", "Anagrafica clienti e animali", "Registro presenze", "1 pensione"]'::jsonb,
  pro_plan_features jsonb NOT NULL DEFAULT '["Tutto del piano Base", "Gestione pagamenti completa", "Preventivi e documenti PDF", "Occupazione casette", "Planning e task", "Multi-pensione (fino a 3)", "Report e statistiche"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- trial_registrations
CREATE TABLE public.trial_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  tenant_id uuid REFERENCES public.tenants(id),
  pet_type public.pet_type NOT NULL DEFAULT 'gatti',
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz NOT NULL,
  is_converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  login_count integer NOT NULL DEFAULT 0,
  last_login_at timestamptz,
  actions_count integer NOT NULL DEFAULT 0,
  pages_visited jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- trial_activity_log
CREATE TABLE public.trial_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.trial_registrations(id),
  action text NOT NULL,
  page text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- email_templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- email_log
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  template_id uuid REFERENCES public.email_templates(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status public.email_status NOT NULL DEFAULT 'queued',
  error_message text,
  provider_message_id text,
  metadata jsonb,
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- email_send_log
CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  message_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- email_send_state
CREATE TABLE public.email_send_state (
  id integer PRIMARY KEY DEFAULT 1,
  send_delay_ms integer NOT NULL DEFAULT 200,
  batch_size integer NOT NULL DEFAULT 10,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  retry_after_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- email_unsubscribe_tokens
CREATE TABLE public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- suppressed_emails
CREATE TABLE public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tenant_stripe_keys
CREATE TABLE public.tenant_stripe_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) UNIQUE,
  stripe_secret_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

-- Trigger: auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_client_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id FROM public.clients WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_client(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.next_booking_number(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _year smallint := EXTRACT(YEAR FROM now())::smallint % 100;
  _counter integer;
BEGIN
  INSERT INTO public.booking_counters (tenant_id, year, last_counter)
  VALUES (_tenant_id, _year, 100)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_counter = booking_counters.last_counter + 1
  RETURNING last_counter INTO _counter;
  RETURN LPAD(_year::text, 2, '0') || LPAD(_counter::text, 3, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.check_availability(_tenant_id uuid, _check_in date, _check_out date)
RETURNS TABLE(cage_pool_type text, max_occupied bigint, total_capacity integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _occupancy_days int; _num_singole int; _num_doppie int;
BEGIN
  SELECT t.occupancy_rule_days, t.num_singole, t.num_doppie
  INTO _occupancy_days, _num_singole, _num_doppie
  FROM tenants t WHERE t.id = _tenant_id;
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(_check_in, _check_out - interval '1 day', interval '1 day')::date AS d
  ),
  occupied AS (
    SELECT b.cage_pool_type AS cpt, dr.d, SUM(b.units_occupied) AS occ
    FROM bookings b CROSS JOIN date_range dr
    WHERE b.tenant_id = _tenant_id
      AND b.status NOT IN ('cancellata', 'rimborsata', 'scaduto')
      AND b.check_in_date <= dr.d AND b.check_out_date > dr.d
    GROUP BY b.cage_pool_type, dr.d
  )
  SELECT cpt::text, COALESCE(MAX(occ), 0), CASE cpt WHEN 'singola' THEN _num_singole ELSE _num_doppie END
  FROM (VALUES ('singola'::cage_pool_type), ('doppia'::cage_pool_type)) v(cpt)
  LEFT JOIN occupied o ON o.cpt = v.cpt
  GROUP BY v.cpt, _num_singole, _num_doppie;
END; $$;

CREATE OR REPLACE FUNCTION public.get_appointment_slot_counts(_tenant_id uuid, _date date, _appointment_type text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_object_agg(to_char(scheduled_at, 'HH24:MI'), cnt), '{}'::jsonb)
  FROM (
    SELECT scheduled_at, COUNT(*)::int AS cnt
    FROM public.appointments
    WHERE tenant_id = _tenant_id AND appointment_type = _appointment_type::appointment_type AND scheduled_at::date = _date
    GROUP BY scheduled_at
  ) sub
$$;

CREATE OR REPLACE FUNCTION public.expire_preventivi(_tenant_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _count integer;
BEGIN
  UPDATE bookings b SET status = 'scaduto', updated_at = now()
  FROM tenants t
  WHERE b.tenant_id = t.id AND b.status = 'preventivo'
    AND b.created_at::date + t.preventivo_validity_days < CURRENT_DATE
    AND (_tenant_id IS NULL OR b.tenant_id = _tenant_id);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

CREATE OR REPLACE FUNCTION public.copy_global_templates_to_tenant(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _global_policy_id uuid; _new_policy_id uuid;
BEGIN
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs WHERE tenant_id IS NULL;
  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order FROM public.payment_methods WHERE tenant_id IS NULL;
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type
  FROM public.price_lists WHERE tenant_id IS NULL;
  SELECT id INTO _global_policy_id FROM public.cancellation_policies WHERE tenant_id IS NULL LIMIT 1;
  IF _global_policy_id IS NOT NULL THEN
    INSERT INTO public.cancellation_policies (tenant_id, admin_fee)
    SELECT _tenant_id, admin_fee FROM public.cancellation_policies WHERE id = _global_policy_id
    RETURNING id INTO _new_policy_id;
    INSERT INTO public.cancellation_policy_rules (policy_id, days_before_checkin, refund_percentage)
    SELECT _new_policy_id, days_before_checkin, refund_percentage
    FROM public.cancellation_policy_rules WHERE policy_id = _global_policy_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_tenant_slot_configs(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.slot_configs WHERE tenant_id = _tenant_id;
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs WHERE tenant_id IS NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_tenant_price_lists(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type
  FROM public.price_lists WHERE tenant_id IS NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_tenant_payment_methods(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.payment_methods WHERE tenant_id = _tenant_id;
  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order FROM public.payment_methods WHERE tenant_id IS NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_tenant_cancellation_policy(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _global_policy_id uuid; _new_policy_id uuid;
BEGIN
  DELETE FROM public.cancellation_policies WHERE tenant_id = _tenant_id;
  SELECT id INTO _global_policy_id FROM public.cancellation_policies WHERE tenant_id IS NULL LIMIT 1;
  IF _global_policy_id IS NOT NULL THEN
    INSERT INTO public.cancellation_policies (tenant_id, admin_fee)
    SELECT _tenant_id, admin_fee FROM public.cancellation_policies WHERE id = _global_policy_id
    RETURNING id INTO _new_policy_id;
    INSERT INTO public.cancellation_policy_rules (policy_id, days_before_checkin, refund_percentage)
    SELECT _new_policy_id, days_before_checkin, refund_percentage
    FROM public.cancellation_policy_rules WHERE policy_id = _global_policy_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_tenant_cascade(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  DELETE FROM public.cancellation_policy_rules WHERE policy_id IN (SELECT id FROM public.cancellation_policies WHERE tenant_id = _tenant_id);
  DELETE FROM public.payments WHERE tenant_id = _tenant_id;
  DELETE FROM public.appointments WHERE tenant_id = _tenant_id;
  DELETE FROM public.booking_cats WHERE booking_id IN (SELECT id FROM public.bookings WHERE tenant_id = _tenant_id);
  DELETE FROM public.cat_registry WHERE tenant_id = _tenant_id;
  DELETE FROM public.documents WHERE tenant_id = _tenant_id;
  DELETE FROM public.bookings WHERE tenant_id = _tenant_id;
  DELETE FROM public.quote_requests WHERE tenant_id = _tenant_id;
  DELETE FROM public.cats WHERE tenant_id = _tenant_id;
  DELETE FROM public.clients WHERE tenant_id = _tenant_id;
  DELETE FROM public.cancellation_policies WHERE tenant_id = _tenant_id;
  DELETE FROM public.cage_overrides WHERE tenant_id = _tenant_id;
  DELETE FROM public.email_log WHERE tenant_id = _tenant_id;
  DELETE FROM public.payment_methods WHERE tenant_id = _tenant_id;
  DELETE FROM public.payment_split_configs WHERE tenant_id = _tenant_id;
  DELETE FROM public.planning_tasks WHERE tenant_id = _tenant_id;
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  DELETE FROM public.slot_configs WHERE tenant_id = _tenant_id;
  DELETE FROM public.role_permissions WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenant_stripe_keys WHERE tenant_id = _tenant_id;
  DELETE FROM public.booking_counters WHERE tenant_id = _tenant_id;
  DELETE FROM public.trial_activity_log WHERE trial_id IN (SELECT id FROM public.trial_registrations WHERE tenant_id = _tenant_id);
  DELETE FROM public.trial_registrations WHERE tenant_id = _tenant_id;
  DELETE FROM public.audit_log WHERE tenant_id = _tenant_id;
  UPDATE public.profiles SET tenant_id = NULL WHERE tenant_id = _tenant_id;
  DELETE FROM public.user_roles WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenants WHERE id = _tenant_id;
END; $$;

-- ============================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_split_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cage_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_stripe_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "Tenant staff manage clients" ON public.clients FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see clients" ON public.clients FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own record" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Clients update own record" ON public.clients FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- cats
CREATE POLICY "Tenant staff manage cats" ON public.cats FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see cats" ON public.cats FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own cats" ON public.cats FOR SELECT TO authenticated USING (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients insert own cats" ON public.cats FOR INSERT TO authenticated WITH CHECK (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients update own cats" ON public.cats FOR UPDATE TO authenticated USING (client_id = get_client_id(auth.uid())) WITH CHECK (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients delete own cats" ON public.cats FOR DELETE TO authenticated USING (client_id = get_client_id(auth.uid()));

-- bookings
CREATE POLICY "Tenant staff manage bookings" ON public.bookings FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see bookings" ON public.bookings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own bookings" ON public.bookings FOR SELECT TO authenticated USING (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients update own booking status" ON public.bookings FOR UPDATE TO authenticated USING (is_client(auth.uid()) AND client_id = get_client_id(auth.uid())) WITH CHECK (is_client(auth.uid()) AND client_id = get_client_id(auth.uid()));

-- booking_cats
CREATE POLICY "Tenant staff manage booking_cats" ON public.booking_cats FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_cats.booking_id AND (b.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_cats.booking_id AND (b.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "Tenant users see booking_cats" ON public.booking_cats FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_cats.booking_id AND (b.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "Clients read own booking_cats" ON public.booking_cats FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM bookings WHERE client_id = get_client_id(auth.uid())));

-- booking_counters
CREATE POLICY "Tenant staff manage booking_counters" ON public.booking_counters FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- appointments
CREATE POLICY "Tenant staff manage appointments" ON public.appointments FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see appointments" ON public.appointments FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own appointments" ON public.appointments FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM bookings WHERE client_id = get_client_id(auth.uid())));
CREATE POLICY "Clients insert own appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (is_client(auth.uid()) AND booking_id IN (SELECT b.id FROM bookings b WHERE b.client_id = get_client_id(auth.uid())) AND tenant_id = (SELECT c.tenant_id FROM clients c WHERE c.user_id = auth.uid() LIMIT 1));
CREATE POLICY "Clients update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (is_client(auth.uid()) AND booking_id IN (SELECT b.id FROM bookings b WHERE b.client_id = get_client_id(auth.uid()))) WITH CHECK (is_client(auth.uid()) AND booking_id IN (SELECT b.id FROM bookings b WHERE b.client_id = get_client_id(auth.uid())));
CREATE POLICY "Clients delete own appointments" ON public.appointments FOR DELETE TO authenticated USING (is_client(auth.uid()) AND booking_id IN (SELECT b.id FROM bookings b WHERE b.client_id = get_client_id(auth.uid())));

-- payments
CREATE POLICY "Tenant staff manage payments" ON public.payments FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see payments" ON public.payments FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read own payments" ON public.payments FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM bookings WHERE client_id = get_client_id(auth.uid())));

-- payment_methods
CREATE POLICY "Tenant users see payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin') OR tenant_id IS NULL);
CREATE POLICY "Titolare/admin manage payment_methods" ON public.payment_methods FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin')) WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin'));

-- payment_split_configs
CREATE POLICY "Tenant users see payment_split_configs" ON public.payment_split_configs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Titolare/admin manage payment_split_configs" ON public.payment_split_configs FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin')) WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read tenant payment_split_configs" ON public.payment_split_configs FOR SELECT TO authenticated USING (is_client(auth.uid()) AND tenant_id = (SELECT c.tenant_id FROM clients c WHERE c.user_id = auth.uid() LIMIT 1));

-- cat_registry
CREATE POLICY "Tenant staff manage cat_registry" ON public.cat_registry FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see cat_registry" ON public.cat_registry FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- cage_overrides
CREATE POLICY "Tenant users see cage_overrides" ON public.cage_overrides FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Titolare/admin manage cage_overrides" ON public.cage_overrides FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin')) WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin'));

-- cancellation_policies
CREATE POLICY "Anyone sees cancellation_policies" ON public.cancellation_policies FOR SELECT TO authenticated USING (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin_titolare manage cancellation_policies" ON public.cancellation_policies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))) WITH CHECK (has_role(auth.uid(), 'admin') OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))));

-- cancellation_policy_rules
CREATE POLICY "Anyone sees cancellation_policy_rules" ON public.cancellation_policy_rules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM cancellation_policies cp WHERE cp.id = cancellation_policy_rules.policy_id AND (cp.tenant_id IS NULL OR cp.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "Admin_titolare manage cancellation_policy_rules" ON public.cancellation_policy_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM cancellation_policies cp WHERE cp.id = cancellation_policy_rules.policy_id AND (has_role(auth.uid(), 'admin') OR (cp.tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager')))))) WITH CHECK (EXISTS (SELECT 1 FROM cancellation_policies cp WHERE cp.id = cancellation_policy_rules.policy_id AND (has_role(auth.uid(), 'admin') OR (cp.tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))))));

-- price_lists
CREATE POLICY "Anyone sees price_lists" ON public.price_lists FOR SELECT TO authenticated USING (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages price_lists" ON public.price_lists FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'titolare'))) WITH CHECK (has_role(auth.uid(), 'admin') OR (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'titolare')));

-- slot_configs
CREATE POLICY "Tenant users see slot_configs" ON public.slot_configs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin') OR tenant_id IS NULL);
CREATE POLICY "Titolare/admin manage slot_configs" ON public.slot_configs FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin')) WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare') OR has_role(auth.uid(), 'manager'))) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients read tenant slot_configs" ON public.slot_configs FOR SELECT TO authenticated USING (is_client(auth.uid()) AND tenant_id = (SELECT c.tenant_id FROM clients c WHERE c.user_id = auth.uid() LIMIT 1));

-- quote_requests
CREATE POLICY "Tenant staff manage requests" ON public.quote_requests FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients manage own requests" ON public.quote_requests FOR ALL TO authenticated USING (client_id = get_client_id(auth.uid())) WITH CHECK (client_id = get_client_id(auth.uid()));

-- audit_log
CREATE POLICY "Tenant users see audit_log" ON public.audit_log FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin') OR tenant_id IS NULL);

-- documents
CREATE POLICY "Tenant staff manage documents" ON public.documents FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see documents" ON public.documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- planning_tasks
CREATE POLICY "Tenant staff manage planning_tasks" ON public.planning_tasks FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users see planning_tasks" ON public.planning_tasks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- role_permissions
CREATE POLICY "Users can read role_permissions" ON public.role_permissions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- demo_leads
CREATE POLICY "Anyone can insert demo_leads" ON public.demo_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can confirm demo_leads by token" ON public.demo_leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins read demo_leads" ON public.demo_leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- landing_config
CREATE POLICY "Anyone reads landing_config" ON public.landing_config FOR SELECT USING (true);
CREATE POLICY "Admins manage landing_config" ON public.landing_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- email_templates
CREATE POLICY "Anyone reads email_templates" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages email_templates" ON public.email_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- email_log
CREATE POLICY "Tenant users see email_log" ON public.email_log FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant staff insert email_log" ON public.email_log FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- email_send_log
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- email_send_state
CREATE POLICY "Service role can manage send state" ON public.email_send_state FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- email_unsubscribe_tokens
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- suppressed_emails
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING (auth.role() = 'service_role');

-- tenant_stripe_keys
CREATE POLICY "tenant_stripe_keys_client_check" ON public.tenant_stripe_keys FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. STORAGE BUCKETS (run separately in Supabase dashboard)
-- ============================================================
-- CREATE BUCKET: tenant-logos (public)
-- CREATE BUCKET: cat-photos (public)
-- CREATE BUCKET: email-assets (public)

-- ============================================================
-- Done! Remember to:
-- 1. Create storage buckets manually in the new Supabase dashboard
-- 2. Configure auth settings (email templates, redirect URLs, etc.)
-- 3. Set up secrets/environment variables
-- 4. Deploy edge functions separately
-- ============================================================
