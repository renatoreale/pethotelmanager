-- Tracks whether the day-7 nudge and the expiring-trial email have already
-- been sent for a given trial, so the daily nurture job never double-sends.
DO $$ BEGIN
  ALTER TABLE public.trial_registrations ADD COLUMN mid_trial_email_sent_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.trial_registrations ADD COLUMN expiring_email_sent_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
