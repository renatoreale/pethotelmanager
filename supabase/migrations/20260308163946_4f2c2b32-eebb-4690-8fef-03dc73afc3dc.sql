
-- Table for configurable payment methods per tenant
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users see payment_methods"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Titolare/admin manage payment_methods"
  ON public.payment_methods FOR ALL TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Update payments table: change method from free text to FK reference
ALTER TABLE public.payments
  ADD COLUMN payment_method_id uuid REFERENCES public.payment_methods(id);
