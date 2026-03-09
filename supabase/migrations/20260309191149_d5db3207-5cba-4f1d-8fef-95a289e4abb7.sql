
-- Add per-pet-type cage columns to tenants
ALTER TABLE public.tenants 
  ADD COLUMN num_singole_gatti integer NOT NULL DEFAULT 0,
  ADD COLUMN num_doppie_gatti integer NOT NULL DEFAULT 0,
  ADD COLUMN num_singole_cani integer NOT NULL DEFAULT 0,
  ADD COLUMN num_doppie_cani integer NOT NULL DEFAULT 0;

-- Backfill: copy existing counts based on pet_type
UPDATE public.tenants SET 
  num_singole_gatti = num_singole,
  num_doppie_gatti = num_doppie
WHERE pet_type = 'gatti';

UPDATE public.tenants SET 
  num_singole_cani = num_singole,
  num_doppie_cani = num_doppie
WHERE pet_type = 'cani';

-- For 'entrambi', split evenly (user will adjust manually)
UPDATE public.tenants SET 
  num_singole_gatti = num_singole,
  num_doppie_gatti = num_doppie,
  num_singole_cani = 0,
  num_doppie_cani = 0
WHERE pet_type = 'entrambi';

-- Add pet_type to bookings for pool tracking
ALTER TABLE public.bookings 
  ADD COLUMN pet_type public.pet_type NULL;
