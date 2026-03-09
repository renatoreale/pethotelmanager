
-- Make slot_configs.tenant_id nullable for global templates
ALTER TABLE public.slot_configs ALTER COLUMN tenant_id DROP NOT NULL;

-- Make payment_methods.tenant_id nullable for global templates  
ALTER TABLE public.payment_methods ALTER COLUMN tenant_id DROP NOT NULL;

-- Update RLS for slot_configs to allow admin to manage global templates (tenant_id IS NULL)
DROP POLICY IF EXISTS "Tenant users see slot_configs" ON public.slot_configs;
CREATE POLICY "Tenant users see slot_configs" ON public.slot_configs
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid())) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Titolare/admin manage slot_configs" ON public.slot_configs;
CREATE POLICY "Titolare/admin manage slot_configs" ON public.slot_configs
  FOR ALL TO authenticated
  USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Update RLS for payment_methods to allow admin to manage global templates
DROP POLICY IF EXISTS "Tenant users see payment_methods" ON public.payment_methods;
CREATE POLICY "Tenant users see payment_methods" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid())) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Titolare/admin manage payment_methods" ON public.payment_methods;
CREATE POLICY "Titolare/admin manage payment_methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Create function to copy global templates to a new tenant
CREATE OR REPLACE FUNCTION public.copy_global_templates_to_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Copy global slot configs
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs
  WHERE tenant_id IS NULL;

  -- Copy global payment methods
  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order
  FROM public.payment_methods
  WHERE tenant_id IS NULL;

  -- Copy global price lists
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type
  FROM public.price_lists
  WHERE tenant_id IS NULL;
END;
$$;
