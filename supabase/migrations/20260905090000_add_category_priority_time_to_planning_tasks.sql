-- Blocco 5: categoria, priorità e orario per le task pianificate, per poterle
-- ordinare (urgenti, poi per orario, poi per priorità) e filtrare per tipo di
-- attività come richiesto dalla pagina "Attività".
-- Tre colonne additive con default sicuri: nessun impatto sulle righe esistenti
-- (prendono il default), coperte dalle RLS tenant-scoped già presenti su
-- planning_tasks. I CHECK vincolano i valori ammessi lato database, a
-- protezione di eventuali scritture dirette fuori dall'applicazione.
ALTER TABLE public.planning_tasks
  ADD COLUMN category TEXT NOT NULL DEFAULT 'altro'
    CHECK (category IN ('alimentazione','farmaco','pulizia','check_in','check_out','foto','controllo','amministrazione','altro')),
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'media'
    CHECK (priority IN ('bassa','media','alta','urgente')),
  ADD COLUMN scheduled_time TIME;

CREATE INDEX IF NOT EXISTS idx_planning_tasks_priority ON public.planning_tasks(priority);
