-- Blocco 4: Piano di cura del soggiorno (alimentazione, farmaci, attività, note speciali).
-- Colonna JSONB nullable su una tabella esistente: additiva, nessun impatto sulle righe
-- già presenti (default NULL). Le policy RLS già esistenti su public.bookings
-- ("Tenant users see bookings" SELECT, "Tenant staff manage bookings" FOR ALL,
-- entrambe tenant-scoped) coprono automaticamente anche questa colonna: nessuna nuova
-- policy necessaria.
ALTER TABLE public.bookings
  ADD COLUMN care_plan JSONB;

COMMENT ON COLUMN public.bookings.care_plan IS
  'Piano di cura del soggiorno (Blocco 4): { feeding: [{food,quantity,time}], medications: [{name,dose,time,duration}], activities: [{activity,frequency,time}], special_notes: string }. Struttura libera, validata lato applicazione.';

-- Collega (facoltativamente) una task pianificata al soggiorno da cui è stata generata,
-- cosi' il piano di cura puo' mostrare le task già create per quel booking.
-- Colonna nullable con ON DELETE SET NULL: additiva, nessun impatto sulle righe esistenti
-- (tutte NULL) e nessuna task viene eliminata se la prenotazione viene rimossa.
-- La tabella planning_tasks è già protetta dalle policy RLS tenant-scoped esistenti
-- ("Tenant users see planning_tasks", "Tenant staff manage planning_tasks").
ALTER TABLE public.planning_tasks
  ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planning_tasks_booking ON public.planning_tasks(booking_id);
