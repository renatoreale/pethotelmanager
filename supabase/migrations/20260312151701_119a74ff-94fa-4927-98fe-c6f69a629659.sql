
-- Allow clients to read slot_configs for their tenant
CREATE POLICY "Clients read tenant slot_configs" ON public.slot_configs
  FOR SELECT TO authenticated
  USING (
    public.is_client(auth.uid())
    AND tenant_id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
  );

-- Allow clients to insert appointments for their own bookings
CREATE POLICY "Clients insert own appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client(auth.uid())
    AND booking_id IN (
      SELECT b.id FROM public.bookings b WHERE b.client_id = public.get_client_id(auth.uid())
    )
    AND tenant_id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
  );

-- Allow clients to update their own appointments
CREATE POLICY "Clients update own appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    public.is_client(auth.uid())
    AND booking_id IN (
      SELECT b.id FROM public.bookings b WHERE b.client_id = public.get_client_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_client(auth.uid())
    AND booking_id IN (
      SELECT b.id FROM public.bookings b WHERE b.client_id = public.get_client_id(auth.uid())
    )
  );

-- Allow clients to delete their own appointments
CREATE POLICY "Clients delete own appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (
    public.is_client(auth.uid())
    AND booking_id IN (
      SELECT b.id FROM public.bookings b WHERE b.client_id = public.get_client_id(auth.uid())
    )
  );

-- Allow clients to update status of their own bookings (for appointment scheduling)
CREATE POLICY "Clients update own booking status" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    public.is_client(auth.uid())
    AND client_id = public.get_client_id(auth.uid())
  )
  WITH CHECK (
    public.is_client(auth.uid())
    AND client_id = public.get_client_id(auth.uid())
  );
