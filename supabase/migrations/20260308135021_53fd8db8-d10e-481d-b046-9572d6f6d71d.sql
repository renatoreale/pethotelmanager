
-- Create tariff type enum
CREATE TYPE public.tariff_type AS ENUM ('stagionale', 'extra_giornaliero', 'extra_km', 'extra_una_tantum');

-- Restructure price_lists: remove cage_pool_type, add tariff fields
ALTER TABLE public.price_lists
  ADD COLUMN tariff_type public.tariff_type NOT NULL DEFAULT 'stagionale',
  ADD COLUMN season text,
  ADD COLUMN fixed_cost numeric DEFAULT 0,
  ADD COLUMN included_km numeric DEFAULT 0,
  ADD COLUMN extra_km_cost numeric DEFAULT 0;

-- Make cage_pool_type nullable (keep column for backward compat but not required)
ALTER TABLE public.price_lists ALTER COLUMN cage_pool_type DROP NOT NULL;
ALTER TABLE public.price_lists ALTER COLUMN cage_pool_type SET DEFAULT NULL;
ALTER TABLE public.price_lists ALTER COLUMN price_per_day SET DEFAULT 0;
