
-- Add pet_type column to price_lists (nullable, so existing records remain valid)
ALTER TABLE public.price_lists ADD COLUMN pet_type public.pet_type NULL;

-- Update the copy_global_templates_to_tenant function to include pet_type
CREATE OR REPLACE FUNCTION public.copy_global_templates_to_tenant(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _global_policy_id uuid;
  _new_policy_id uuid;
BEGIN
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs WHERE tenant_id IS NULL;

  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order
  FROM public.payment_methods WHERE tenant_id IS NULL;

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
END;
$function$;

-- Update reset_tenant_price_lists to include pet_type
CREATE OR REPLACE FUNCTION public.reset_tenant_price_lists(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type
  FROM public.price_lists WHERE tenant_id IS NULL;
END;
$function$;
