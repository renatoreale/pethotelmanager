
-- Add new appointment status values to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'appuntamento_in_fissato';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'appuntamento_out_fissato';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'appuntamento_in_out_fissato';
