-- Diario — conservazione limitata delle foto (15 giorni dopo il check-out).
--
-- Le foto del diario (Blocco 8) restano conservate fino a 15 giorni dopo la
-- data di check-out del soggiorno a cui sono collegate; trascorso questo
-- periodo, la voce di diario (testo + foto) viene eliminata insieme al file
-- nello storage. Le voci NON collegate a nessuna prenotazione (booking_id
-- NULL) non hanno una data di check-out da cui calcolare la scadenza e
-- restano quindi escluse da questa pulizia.
--
-- Impatto: nessuna tabella/colonna esistente viene modificata — solo una
-- nuova funzione SECURITY DEFINER (eseguibile solo da service_role, come
-- le altre funzioni di manutenzione già presenti) e un nuovo job pg_cron,
-- sullo stesso modello già in uso per "cleanup-expired-trials-daily".
-- Attenzione: questa è un'eliminazione ricorrente e irreversibile di dati
-- (foto + testo del diario) oltre la finestra dei 15 giorni — è il
-- comportamento esplicitamente richiesto, non un effetto collaterale.

CREATE OR REPLACE FUNCTION public.cleanup_expired_diario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photo_paths text[];
BEGIN
  SELECT array_agg(de.photo_path) INTO photo_paths
  FROM public.diario_entries de
  JOIN public.bookings b ON b.id = de.booking_id
  WHERE de.photo_path IS NOT NULL
    AND b.check_out_date < (CURRENT_DATE - 15);

  IF photo_paths IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'diario-photos' AND name = ANY(photo_paths);
  END IF;

  DELETE FROM public.diario_entries de
  USING public.bookings b
  WHERE b.id = de.booking_id
    AND b.check_out_date < (CURRENT_DATE - 15);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_diario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_diario() TO service_role;

SELECT cron.schedule(
  'cleanup-expired-diario-daily',
  '0 4 * * *',
  $$ SELECT public.cleanup_expired_diario(); $$
);
