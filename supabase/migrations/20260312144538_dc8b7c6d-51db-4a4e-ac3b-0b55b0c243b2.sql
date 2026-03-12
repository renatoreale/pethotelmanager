
CREATE OR REPLACE FUNCTION public.check_availability(
  _tenant_id uuid,
  _check_in date,
  _check_out date
)
RETURNS TABLE(cage_pool_type text, max_occupied bigint, total_capacity int) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _occupancy_days int;
  _num_singole int;
  _num_doppie int;
BEGIN
  SELECT t.occupancy_rule_days, t.num_singole, t.num_doppie
  INTO _occupancy_days, _num_singole, _num_doppie
  FROM tenants t WHERE t.id = _tenant_id;

  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(_check_in, _check_out - interval '1 day', interval '1 day')::date AS d
  ),
  occupied AS (
    SELECT 
      b.cage_pool_type AS cpt,
      dr.d,
      SUM(b.units_occupied) AS occ
    FROM bookings b
    CROSS JOIN date_range dr
    WHERE b.tenant_id = _tenant_id
      AND b.status NOT IN ('cancellata', 'rimborsata', 'scaduto')
      AND b.check_in_date <= dr.d
      AND b.check_out_date > dr.d
    GROUP BY b.cage_pool_type, dr.d
  )
  SELECT 
    cpt::text AS cage_pool_type,
    COALESCE(MAX(occ), 0) AS max_occupied,
    CASE cpt WHEN 'singola' THEN _num_singole ELSE _num_doppie END AS total_capacity
  FROM (VALUES ('singola'::cage_pool_type), ('doppia'::cage_pool_type)) v(cpt)
  LEFT JOIN occupied o ON o.cpt = v.cpt
  GROUP BY v.cpt, _num_singole, _num_doppie;
END;
$$;
