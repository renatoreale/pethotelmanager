-- Collega (facoltativamente) una task pianificata al pet a cui si riferisce, così la
-- dashboard e la pagina di gestione task possono mostrare a colpo d'occhio di quale
-- animale si tratta, invece di doverlo dedurre dal solo titolo testuale.
-- Colonna nullable con ON DELETE SET NULL: additiva, nessun impatto sulle righe
-- esistenti (tutte NULL), nessuna task viene eliminata se il pet viene rimosso.
-- La tabella planning_tasks è già protetta dalle policy RLS tenant-scoped esistenti.
ALTER TABLE public.planning_tasks
  ADD COLUMN cat_id UUID REFERENCES public.cats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planning_tasks_cat ON public.planning_tasks(cat_id);
