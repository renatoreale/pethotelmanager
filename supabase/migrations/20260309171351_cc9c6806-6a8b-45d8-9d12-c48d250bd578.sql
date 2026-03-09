ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cap text,
  ADD COLUMN IF NOT EXISTS city text;