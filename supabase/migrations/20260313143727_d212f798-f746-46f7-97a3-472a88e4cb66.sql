
ALTER TABLE public.demo_leads
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS privacy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS token uuid DEFAULT gen_random_uuid();

-- Rename full_name to first_name for clarity (but keep full_name for backward compat)
-- Actually let's just keep full_name as first_name usage
