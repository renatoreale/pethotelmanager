
-- Cat registry table for tracking cats currently/previously in the facility
CREATE TABLE public.cat_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  cat_id UUID NOT NULL REFERENCES public.cats(id),
  client_name TEXT NOT NULL,
  cat_name TEXT NOT NULL,
  microchip TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cat_registry ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant users see cat_registry"
  ON public.cat_registry FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant staff manage cat_registry"
  ON public.cat_registry FOR ALL
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Updated_at trigger
CREATE TRIGGER update_cat_registry_updated_at
  BEFORE UPDATE ON public.cat_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
