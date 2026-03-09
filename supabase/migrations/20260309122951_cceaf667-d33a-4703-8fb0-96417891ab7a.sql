
CREATE TABLE public.cancellation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  admin_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE TABLE public.cancellation_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.cancellation_policies(id) ON DELETE CASCADE NOT NULL,
  days_before_checkin integer NOT NULL,
  refund_percentage numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, days_before_checkin)
);

ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone sees cancellation_policies"
  ON public.cancellation_policies FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id = get_user_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin_titolare manage cancellation_policies"
  ON public.cancellation_policies FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
  );

CREATE POLICY "Anyone sees cancellation_policy_rules"
  ON public.cancellation_policy_rules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cancellation_policies cp
      WHERE cp.id = cancellation_policy_rules.policy_id
      AND (cp.tenant_id IS NULL OR cp.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Admin_titolare manage cancellation_policy_rules"
  ON public.cancellation_policy_rules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cancellation_policies cp
      WHERE cp.id = cancellation_policy_rules.policy_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (cp.tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cancellation_policies cp
      WHERE cp.id = cancellation_policy_rules.policy_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (cp.tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
      )
    )
  );

CREATE OR REPLACE FUNCTION public.reset_tenant_cancellation_policy(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _global_policy_id uuid;
  _new_policy_id uuid;
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
END;
$$;

CREATE OR REPLACE FUNCTION public.copy_global_templates_to_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type
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
$$;
