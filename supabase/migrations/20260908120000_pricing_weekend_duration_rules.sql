-- BLOCCO 19 — Pricing: due nuove regole tariffarie configurabili dal
-- titolare nel Listino Prezzi esistente (non si crea una pagina nuova):
-- supplemento weekend (percentuale sulle notti di sabato/domenica) e sconto
-- per durata soggiorno (percentuale, a partire da un numero minimo di
-- notti). Additiva: nessuna tariffa esistente viene toccata, i preventivi/
-- prenotazioni già creati restano invariati (total_amount è uno snapshot,
-- non ricalcolato).
ALTER TYPE public.tariff_type ADD VALUE IF NOT EXISTS 'weekend';
ALTER TYPE public.tariff_type ADD VALUE IF NOT EXISTS 'durata_soggiorno';

ALTER TABLE public.price_lists
  ADD COLUMN percentage numeric,
  ADD COLUMN min_nights integer;
