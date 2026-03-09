
CREATE OR REPLACE FUNCTION public.reset_tenant_slot_configs(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.slot_configs WHERE tenant_id = _tenant_id;
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs WHERE tenant_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_tenant_price_lists(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type
  FROM public.price_lists WHERE tenant_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_tenant_payment_methods(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.payment_methods WHERE tenant_id = _tenant_id;
  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order
  FROM public.payment_methods WHERE tenant_id IS NULL;
END;
$$;
