
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS quote_request_id uuid REFERENCES public.quote_requests(id) DEFAULT NULL;
