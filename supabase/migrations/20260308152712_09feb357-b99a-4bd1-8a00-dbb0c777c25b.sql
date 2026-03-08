
ALTER TABLE public.slot_configs 
ADD COLUMN appointment_type text NOT NULL DEFAULT 'check_in';

COMMENT ON COLUMN public.slot_configs.appointment_type IS 'Type of appointment: check_in or check_out';
