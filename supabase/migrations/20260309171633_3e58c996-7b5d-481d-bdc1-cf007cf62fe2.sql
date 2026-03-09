ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_cats integer NOT NULL DEFAULT 0;