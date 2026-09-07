-- Blocco 14 — Pre-check-in online.
--
-- "Dati proprietario" e "dati pet" sono già gestibili direttamente dal
-- cliente (pagine esistenti /cliente/profilo e /cliente/animali, con RLS
-- già in produzione da prima di questo blocco): il wizard di pre-check-in
-- li mostra in sola lettura con link a quelle pagine, non li duplica.
--
-- Restano da aggiungere:
-- 1. il contatto di emergenza (nuovo, non esisteva): tre colonne su
--    clients, stesso livello di rischio dei campi che il cliente può già
--    modificare sul proprio record (RLS "Clients update own record" già
--    esistente, nessuna nuova concessione di scrittura).
-- 2. le segnalazioni di alimentazione/farmaci specifiche del soggiorno e i
--    consensi: una nuova tabella pre_checkin_submissions, separata dal
--    piano di cura operativo (bookings.care_plan). Lo staff la rivede e
--    decide se riportarla nel piano di cura: nessuna scrittura diretta del
--    cliente su dati operativi usati per generare i task di farmaci/pasti.

ALTER TABLE public.clients
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_phone text,
  ADD COLUMN emergency_contact_relation text;

CREATE TABLE public.pre_checkin_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  feeding_notes text,
  medication_notes text,
  privacy_accepted_version text,
  regolamento_accepted_version text,
  consents_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pre_checkin_submissions_tenant ON public.pre_checkin_submissions(tenant_id);

ALTER TABLE public.pre_checkin_submissions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pre_checkin_submissions_updated_at
  BEFORE UPDATE ON public.pre_checkin_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant staff read pre-checkin submissions" ON public.pre_checkin_submissions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Clients read own pre-checkin submission" ON public.pre_checkin_submissions
  FOR SELECT TO authenticated
  USING (public.is_client(auth.uid()) AND client_id = public.get_client_id(auth.uid()));

CREATE POLICY "Clients insert own pre-checkin submission" ON public.pre_checkin_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_client(auth.uid())
    AND client_id = public.get_client_id(auth.uid())
    AND booking_id IN (SELECT id FROM public.bookings WHERE client_id = public.get_client_id(auth.uid()))
  );

CREATE POLICY "Clients update own pre-checkin submission" ON public.pre_checkin_submissions
  FOR UPDATE TO authenticated
  USING (public.is_client(auth.uid()) AND client_id = public.get_client_id(auth.uid()))
  WITH CHECK (public.is_client(auth.uid()) AND client_id = public.get_client_id(auth.uid()));
