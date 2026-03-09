
-- Create pet_type enum
CREATE TYPE public.pet_type AS ENUM ('gatti', 'cani', 'entrambi');

-- Add pet_type column to tenants
ALTER TABLE public.tenants ADD COLUMN pet_type public.pet_type NOT NULL DEFAULT 'gatti';
