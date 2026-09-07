-- BLOCCO 9 — Documenti/requisiti del soggiorno.
--
-- La tabella "documents" esiste già dalla migrazione iniziale (tenant_id,
-- booking_id opzionale, document_type, file_name, storage_path, mime_type,
-- created_by, created_at) ma finora non veniva mai scritta: nessun bucket
-- di storage esisteva per contenerne i file. Questa migrazione:
--
-- 1) Vincola document_type a un set noto di categorie (libretto vaccinale,
--    certificato sanitario, modulo di affido, documento d'identità, altro),
--    così la UI può mostrare un checklist di "requisiti" coerente. La
--    tabella è ad oggi vuota (mai scritta), quindi il CHECK non rompe dati
--    esistenti.
-- 2) Crea il bucket di storage "booking-documents". A differenza di
--    cat-photos/tenant-logos (pubblici, foto non sensibili), qui possono
--    finire documenti con dati personali (documento d'identità, libretto
--    sanitario): il bucket è PRIVATO e le policy di storage.objects
--    verificano che il primo segmento del path corrisponda al tenant
--    dell'utente autenticato — un isolamento più stretto di quello già in
--    uso per gli altri bucket di questo progetto. L'app genera URL firmate
--    a breve scadenza per la visualizzazione, non URL pubbliche.

ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'libretto_vaccinazioni', 'certificato_sanitario', 'modulo_affido',
    'documento_identita', 'altro'
  ));

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-documents', 'booking-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant read own booking documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND (
    (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Tenant upload own booking documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'booking-documents'
  AND (
    (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Tenant update own booking documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND (
    (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Tenant delete own booking documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND (
    (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
