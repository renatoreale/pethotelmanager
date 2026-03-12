
-- Security definer function to count appointments per time slot
-- This allows clients to see slot occupancy without reading other clients' appointments
CREATE OR REPLACE FUNCTION public.get_appointment_slot_counts(
  _tenant_id UUID,
  _date DATE,
  _appointment_type TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      to_char(scheduled_at, 'HH24:MI'),
      cnt
    ),
    '{}'::jsonb
  )
  FROM (
    SELECT scheduled_at, COUNT(*)::int AS cnt
    FROM public.appointments
    WHERE tenant_id = _tenant_id
      AND appointment_type = _appointment_type::appointment_type
      AND scheduled_at::date = _date
    GROUP BY scheduled_at
  ) sub
$$;
