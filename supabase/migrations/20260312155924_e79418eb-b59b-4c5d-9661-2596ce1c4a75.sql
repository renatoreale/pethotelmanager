-- Function to expire preventivi past their validity date
CREATE OR REPLACE FUNCTION public.expire_preventivi(_tenant_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE bookings b
  SET status = 'scaduto', updated_at = now()
  FROM tenants t
  WHERE b.tenant_id = t.id
    AND b.status = 'preventivo'
    AND b.created_at::date + t.preventivo_validity_days < CURRENT_DATE
    AND (_tenant_id IS NULL OR b.tenant_id = _tenant_id);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;