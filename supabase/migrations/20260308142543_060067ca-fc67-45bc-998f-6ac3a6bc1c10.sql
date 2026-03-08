
-- Fix: default should be to count both checkin and checkout days in "giorni" mode
ALTER TABLE public.tenants ALTER COLUMN count_checkin_day SET DEFAULT true;
ALTER TABLE public.tenants ALTER COLUMN count_checkout_day SET DEFAULT true;

-- Update existing tenants to use correct defaults
UPDATE public.tenants SET count_checkin_day = true, count_checkout_day = true;
