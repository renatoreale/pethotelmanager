
-- Add user_id to clients for auth linking
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id) WHERE user_id IS NOT NULL;

-- Helper: get client record ID for authenticated user
CREATE OR REPLACE FUNCTION public.get_client_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.clients WHERE user_id = _user_id LIMIT 1 $$;

-- Helper: check if user is a client
CREATE OR REPLACE FUNCTION public.is_client(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.clients WHERE user_id = _user_id) $$;

-- Client self-service RLS policies
CREATE POLICY "Clients read own record" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Clients update own record" ON public.clients FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clients read own cats" ON public.cats FOR SELECT TO authenticated USING (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients update own cats" ON public.cats FOR UPDATE TO authenticated USING (client_id = get_client_id(auth.uid())) WITH CHECK (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients insert own cats" ON public.cats FOR INSERT TO authenticated WITH CHECK (client_id = get_client_id(auth.uid()));
CREATE POLICY "Clients delete own cats" ON public.cats FOR DELETE TO authenticated USING (client_id = get_client_id(auth.uid()));

CREATE POLICY "Clients read own bookings" ON public.bookings FOR SELECT TO authenticated USING (client_id = get_client_id(auth.uid()));

CREATE POLICY "Clients read own booking_cats" ON public.booking_cats FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM public.bookings WHERE client_id = get_client_id(auth.uid())));

CREATE POLICY "Clients read own payments" ON public.payments FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM public.bookings WHERE client_id = get_client_id(auth.uid())));

CREATE POLICY "Clients read own appointments" ON public.appointments FOR SELECT TO authenticated USING (booking_id IN (SELECT id FROM public.bookings WHERE client_id = get_client_id(auth.uid())));

CREATE POLICY "Clients read own tenant" ON public.tenants FOR SELECT TO authenticated USING (id IN (SELECT tenant_id FROM public.clients WHERE user_id = auth.uid()));

-- Quote requests table
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  num_pets integer NOT NULL DEFAULT 1,
  pet_names text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own requests" ON public.quote_requests FOR ALL TO authenticated USING (client_id = get_client_id(auth.uid())) WITH CHECK (client_id = get_client_id(auth.uid()));

CREATE POLICY "Tenant staff manage requests" ON public.quote_requests FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));
