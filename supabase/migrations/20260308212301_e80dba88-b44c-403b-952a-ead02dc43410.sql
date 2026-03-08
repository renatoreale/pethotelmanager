
-- Table to track yearly booking counters per tenant
CREATE TABLE public.booking_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year smallint NOT NULL,
  last_counter integer NOT NULL DEFAULT 99,
  PRIMARY KEY (tenant_id, year)
);

ALTER TABLE public.booking_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage booking_counters"
  ON public.booking_counters FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Function to get next booking number: YY + 3-digit counter starting from 100
CREATE OR REPLACE FUNCTION public.next_booking_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END;
$$;
