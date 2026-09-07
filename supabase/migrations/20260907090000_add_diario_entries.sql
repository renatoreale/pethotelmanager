-- BLOCCO 8 — Diario / aggiornamenti con foto.
--
-- Nuova tabella "diario_entries": un feed di aggiornamenti testuali (con
-- foto opzionale) che lo staff pubblica su un pet, es. "Micio ha mangiato
-- bene stamattina" + foto. È collegata al pet (cat_id, obbligatorio) e,
-- quando disponibile, alla prenotazione/soggiorno in corso (booking_id,
-- opzionale — un pet può avere un diario anche fuori da un soggiorno).
--
-- Impatto: additiva, nessuna tabella esistente viene alterata. Segue
-- esattamente lo stesso pattern RLS già in uso per "documents" (stesso
-- design nella migrazione iniziale): lettura e scrittura consentite a
-- chiunque appartenga al tenant (o sia admin) — la restrizione più fine
-- (chi può scrivere in UI) resta a livello applicativo, tramite il
-- permesso "gatti" già usato per la scheda pet (stesso modello già in uso
-- per "documents"/"planning_tasks").
--
-- Viene inoltre creato un nuovo bucket di storage pubblico "diario-photos"
-- per le foto allegate, con le stesse policy già in uso per "cat-photos":
-- lettura pubblica, upload/update/delete riservati agli utenti autenticati
-- (la tenant-scoping delle foto resta per convenzione di path, come già
-- avviene per cat-photos/tenant-logos — nessuna policy esistente in questo
-- progetto applica un controllo per-tenant a livello di storage).

CREATE TABLE public.diario_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id),
  note TEXT NOT NULL,
  photo_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diario_entries_cat_id ON public.diario_entries(cat_id, created_at DESC);
CREATE INDEX idx_diario_entries_booking_id ON public.diario_entries(booking_id);
CREATE INDEX idx_diario_entries_tenant_id ON public.diario_entries(tenant_id);

ALTER TABLE public.diario_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users see diario" ON public.diario_entries
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage diario" ON public.diario_entries
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Storage bucket per le foto del diario
INSERT INTO storage.buckets (id, name, public)
VALUES ('diario-photos', 'diario-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read diario photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'diario-photos');

CREATE POLICY "Authenticated upload diario photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diario-photos');

CREATE POLICY "Authenticated update diario photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'diario-photos');

CREATE POLICY "Authenticated delete diario photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diario-photos');
