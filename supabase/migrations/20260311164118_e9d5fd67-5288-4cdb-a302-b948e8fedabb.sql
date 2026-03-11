
-- Add IBAN/bank info and stamp duty to tenants
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS iban_holder text,
  ADD COLUMN IF NOT EXISTS bollo_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preventivo_validity_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS preventivo_footer_text text;

-- Payment split configs per tenant
CREATE TABLE public.payment_split_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  payment_moment text NOT NULL DEFAULT 'caparra',
  sort_order integer NOT NULL DEFAULT 0,
  payment_method_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_split_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant users see payment_split_configs"
  ON public.payment_split_configs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Titolare/admin manage payment_split_configs"
  ON public.payment_split_configs
  FOR ALL
  TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'titolare'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );
