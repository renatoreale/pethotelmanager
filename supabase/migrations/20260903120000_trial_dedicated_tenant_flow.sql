-- ============================================================
-- Nuovo flusso trial: pensione dedicata per ogni utente (invece
-- del tenant condiviso "la-zampa-felice"), attivabile con un flag.
--
-- Migration puramente additiva e retrocompatibile:
--   - nuove colonne con DEFAULT, nessuna riga esistente cambia valore
--   - nessun trigger/policy esistente viene toccato
--   - il flag new_trial_flow_enabled parte spento: finche' resta
--     cosi', il comportamento in produzione e' identico a prima
-- ============================================================

-- Flag booleano per distinguere i tenant di prova dedicati (nuovo
-- flusso) dal resto. NON viene applicato al tenant condiviso
-- "la-zampa-felice", che resta fuori da questa e dalle future
-- logiche (es. cancellazione automatica) legate a questo flag.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;

-- Interruttore generale del nuovo flusso, gestibile da Admin >
-- Configurazione Landing. Default OFF: nessun impatto finche' non
-- viene attivato esplicitamente e testato.
ALTER TABLE public.landing_config
  ADD COLUMN IF NOT EXISTS new_trial_flow_enabled boolean NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- Dati di test per la pensione trial dedicata: anagrafiche,
-- gatti, preventivi, prenotazioni con check-in/check-out passati,
-- presenti e futuri rispetto alla data di registrazione, cosi'
-- l'utente puo' esplorare subito il gestionale senza partire da
-- zero. Dati generati da zero, mai copiati da tenant reali o dal
-- tenant demo condiviso. Va chiamata DOPO copy_global_templates_to_tenant
-- (cosi' trova un metodo di pagamento gia' configurato sul tenant).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_trial_demo_data(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payment_method_id uuid;
  _client_a uuid; _client_b uuid; _client_c uuid; _client_d uuid;
  _cat_micio uuid; _cat_luna uuid; _cat_tom uuid; _cat_jerry uuid; _cat_birba uuid;
  _booking_a uuid; _booking_b uuid; _booking_c uuid; _booking_d uuid;
  _quote_d uuid;
BEGIN
  SELECT id INTO _payment_method_id
  FROM public.payment_methods
  WHERE tenant_id = _tenant_id AND is_active
  ORDER BY sort_order LIMIT 1;

  -- Cliente A: soggiorno passato e concluso (chiusa) --------------
  INSERT INTO public.clients (tenant_id, first_name, last_name, email, phone, fiscal_code)
  VALUES (_tenant_id, 'Mario', 'Rossi', 'mario.rossi.demo@example.com', '+39 333 1110001', 'RSSMRA80A01H501X')
  RETURNING id INTO _client_a;

  INSERT INTO public.cats (tenant_id, client_id, name, breed, gender, pet_type, is_neutered)
  VALUES (_tenant_id, _client_a, 'Micio', 'Europeo', 'M', 'gatti', true)
  RETURNING id INTO _cat_micio;

  INSERT INTO public.bookings (
    tenant_id, client_id, booking_number, status, check_in_date, check_out_date,
    cage_pool_type, units_occupied, total_amount, deposit_amount, pet_type
  ) VALUES (
    _tenant_id, _client_a, public.next_booking_number(_tenant_id), 'chiusa',
    (CURRENT_DATE - INTERVAL '20 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date,
    'singola', 1, 150, 50, 'gatti'
  ) RETURNING id INTO _booking_a;

  INSERT INTO public.booking_cats (booking_id, cat_id) VALUES (_booking_a, _cat_micio);

  INSERT INTO public.cat_registry (tenant_id, booking_id, cat_id, client_name, cat_name, check_in_date, check_out_date)
  VALUES (_tenant_id, _booking_a, _cat_micio, 'Mario Rossi', 'Micio', (CURRENT_DATE - INTERVAL '20 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date);

  INSERT INTO public.payments (tenant_id, booking_id, payment_type, amount, payment_date, method, payment_method_id)
  VALUES (_tenant_id, _booking_a, 'saldo', 150, now() - INTERVAL '15 days', 'Contanti', _payment_method_id);

  -- Cliente B: ospite attualmente in pensione (in_corso) -----------
  INSERT INTO public.clients (tenant_id, first_name, last_name, email, phone, fiscal_code)
  VALUES (_tenant_id, 'Giulia', 'Bianchi', 'giulia.bianchi.demo@example.com', '+39 333 1110002', 'BNCGLI85B41H501Y')
  RETURNING id INTO _client_b;

  INSERT INTO public.cats (tenant_id, client_id, name, breed, gender, pet_type, is_neutered)
  VALUES (_tenant_id, _client_b, 'Luna', 'Siamese', 'F', 'gatti', true)
  RETURNING id INTO _cat_luna;

  INSERT INTO public.bookings (
    tenant_id, client_id, booking_number, status, check_in_date, check_out_date,
    cage_pool_type, units_occupied, total_amount, deposit_amount, pet_type
  ) VALUES (
    _tenant_id, _client_b, public.next_booking_number(_tenant_id), 'in_corso',
    (CURRENT_DATE - INTERVAL '2 days')::date, (CURRENT_DATE + INTERVAL '3 days')::date,
    'singola', 1, 125, 50, 'gatti'
  ) RETURNING id INTO _booking_b;

  INSERT INTO public.booking_cats (booking_id, cat_id) VALUES (_booking_b, _cat_luna);

  INSERT INTO public.cat_registry (tenant_id, booking_id, cat_id, client_name, cat_name, check_in_date, check_out_date)
  VALUES (_tenant_id, _booking_b, _cat_luna, 'Giulia Bianchi', 'Luna', (CURRENT_DATE - INTERVAL '2 days')::date, NULL);

  INSERT INTO public.payments (tenant_id, booking_id, payment_type, amount, payment_date, method, payment_method_id)
  VALUES (_tenant_id, _booking_b, 'caparra', 50, now() - INTERVAL '2 days', 'Bonifico', _payment_method_id);

  INSERT INTO public.appointments (tenant_id, booking_id, appointment_type, scheduled_at, confirmed)
  VALUES (_tenant_id, _booking_b, 'check_out', (CURRENT_DATE + INTERVAL '3 days')::date + TIME '11:00', true);

  -- Cliente C: prenotazione futura confermata, 2 gatti -------------
  INSERT INTO public.clients (tenant_id, first_name, last_name, email, phone, fiscal_code)
  VALUES (_tenant_id, 'Luca', 'Verdi', 'luca.verdi.demo@example.com', '+39 333 1110003', 'VRDLCU75C15H501Z')
  RETURNING id INTO _client_c;

  INSERT INTO public.cats (tenant_id, client_id, name, breed, gender, pet_type, is_neutered, sibling_group_id)
  VALUES (_tenant_id, _client_c, 'Tom', 'Certosino', 'M', 'gatti', true, gen_random_uuid())
  RETURNING id INTO _cat_tom;

  INSERT INTO public.cats (tenant_id, client_id, name, breed, gender, pet_type, is_neutered)
  VALUES (_tenant_id, _client_c, 'Jerry', 'Certosino', 'M', 'gatti', true)
  RETURNING id INTO _cat_jerry;

  INSERT INTO public.bookings (
    tenant_id, client_id, booking_number, status, check_in_date, check_out_date,
    cage_pool_type, units_occupied, total_amount, deposit_amount, pet_type
  ) VALUES (
    _tenant_id, _client_c, public.next_booking_number(_tenant_id), 'confermata',
    (CURRENT_DATE + INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '15 days')::date,
    'doppia', 1, 225, 75, 'gatti'
  ) RETURNING id INTO _booking_c;

  INSERT INTO public.booking_cats (booking_id, cat_id) VALUES (_booking_c, _cat_tom), (_booking_c, _cat_jerry);

  INSERT INTO public.payments (tenant_id, booking_id, payment_type, amount, payment_date, method, payment_method_id)
  VALUES (_tenant_id, _booking_c, 'caparra', 75, now(), 'Bonifico', _payment_method_id);

  INSERT INTO public.appointments (tenant_id, booking_id, appointment_type, scheduled_at, confirmed)
  VALUES (_tenant_id, _booking_c, 'check_in', (CURRENT_DATE + INTERVAL '10 days')::date + TIME '10:00', true);

  -- Cliente D: richiesta preventivo, ancora da confermare ----------
  INSERT INTO public.clients (tenant_id, first_name, last_name, email, phone, fiscal_code)
  VALUES (_tenant_id, 'Anna', 'Ferrari', 'anna.ferrari.demo@example.com', '+39 333 1110004', 'FRRNNA90D50H501W')
  RETURNING id INTO _client_d;

  INSERT INTO public.cats (tenant_id, client_id, name, breed, gender, pet_type, is_neutered)
  VALUES (_tenant_id, _client_d, 'Birba', 'Europeo', 'F', 'gatti', false)
  RETURNING id INTO _cat_birba;

  INSERT INTO public.quote_requests (tenant_id, client_id, check_in_date, check_out_date, num_pets, pet_names, status)
  VALUES (_tenant_id, _client_d, (CURRENT_DATE + INTERVAL '25 days')::date, (CURRENT_DATE + INTERVAL '28 days')::date, 1, 'Birba', 'pending')
  RETURNING id INTO _quote_d;

  INSERT INTO public.bookings (
    tenant_id, client_id, booking_number, status, check_in_date, check_out_date,
    cage_pool_type, units_occupied, total_amount, deposit_amount, pet_type, quote_request_id
  ) VALUES (
    _tenant_id, _client_d, public.next_booking_number(_tenant_id), 'preventivo',
    (CURRENT_DATE + INTERVAL '25 days')::date, (CURRENT_DATE + INTERVAL '28 days')::date,
    'singola', 1, 90, 0, 'gatti', _quote_d
  ) RETURNING id INTO _booking_d;

  INSERT INTO public.booking_cats (booking_id, cat_id) VALUES (_booking_d, _cat_birba);
END;
$$;
