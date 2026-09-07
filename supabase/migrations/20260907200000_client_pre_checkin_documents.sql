-- Pre-check-in online — il cliente carica da solo i documenti richiesti.
--
-- Finora "documents" e il bucket "booking-documents" erano accessibili solo
-- allo staff: le policy si basano su get_user_tenant_id(auth.uid()), che per
-- una sessione cliente (autenticata via clients.user_id, non via
-- profiles/user_roles) restituisce sempre NULL — stesso problema già
-- risolto per diario_entries. Qui si dà al cliente la possibilità di
-- leggere e caricare (MAI modificare o eliminare) i documenti delle
-- proprie prenotazioni, con lo stesso pattern (is_client + get_client_id)
-- già in uso per i clienti in questo progetto.
--
-- Impatto: additivo, nessuna policy esistente viene modificata o rimossa.
-- Il cliente può leggere/caricare SOLO le proprie righe (booking_id di una
-- propria prenotazione, o client_id = il proprio) — non ha accesso a
-- documenti di altri clienti né può eliminare/modificare quanto caricato
-- (in caso di errore deve ricaricare un file corretto o contattare lo
-- staff, che ha comunque accesso completo di gestione).

CREATE POLICY "Clients read own booking documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_client(auth.uid())
    AND (
      client_id = public.get_client_id(auth.uid())
      OR booking_id IN (SELECT id FROM public.bookings WHERE client_id = public.get_client_id(auth.uid()))
    )
  );

CREATE POLICY "Clients insert own booking documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client(auth.uid())
    AND tenant_id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
    AND (
      client_id = public.get_client_id(auth.uid())
      OR booking_id IN (SELECT id FROM public.bookings WHERE client_id = public.get_client_id(auth.uid()))
    )
  );

CREATE POLICY "Clients read own booking documents storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'booking-documents'
    AND public.is_client(auth.uid())
    AND (storage.foldername(name))[1] = (SELECT c.tenant_id::text FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Clients upload own booking documents storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-documents'
    AND public.is_client(auth.uid())
    AND (storage.foldername(name))[1] = (SELECT c.tenant_id::text FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
  );
