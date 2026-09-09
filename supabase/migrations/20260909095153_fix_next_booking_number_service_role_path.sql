-- Correzione: next_booking_number viene chiamata anche INTERNAMENTE da
-- seed_trial_demo_data (contesto service role durante la registrazione
-- trial, dove auth.uid() è NULL perché non c'è un utente-JWT). Il
-- controllo precedente avrebbe bloccato anche quella chiamata legittima.
CREATE OR REPLACE FUNCTION public.next_booking_number(_tenant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year smallint := EXTRACT(YEAR FROM now())::smallint % 100;
  _counter integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (has_role(auth.uid(), 'admin'::app_role) OR _tenant_id = get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato per questo tenant';
  END IF;
  INSERT INTO public.booking_counters (tenant_id, year, last_counter)
  VALUES (_tenant_id, _year, 100)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_counter = booking_counters.last_counter + 1
  RETURNING last_counter INTO _counter;
  RETURN LPAD(_year::text, 2, '0') || LPAD(_counter::text, 3, '0');
END; $function$;
