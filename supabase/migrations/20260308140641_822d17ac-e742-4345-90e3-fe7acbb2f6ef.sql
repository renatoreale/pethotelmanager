
-- Add stay calculation config to tenants
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS stay_calc_type text NOT NULL DEFAULT 'notti',
  ADD COLUMN IF NOT EXISTS count_checkin_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS count_checkout_day boolean NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.tenants.stay_calc_type IS 'notti or giorni - how to calculate stay duration';
COMMENT ON COLUMN public.tenants.count_checkin_day IS 'For giorni mode: count check-in day';
COMMENT ON COLUMN public.tenants.count_checkout_day IS 'For giorni mode: count check-out day';
