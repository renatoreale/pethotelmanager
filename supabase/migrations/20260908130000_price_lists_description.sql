-- BLOCCO 20 — Servizi Extra: aggiunge una descrizione opzionale ai servizi
-- del Listino Prezzi (trasporto, cat sitting, dog walking, farmaci,
-- grooming, foto, servizio premium, ecc.), così com'è già per nome, prezzo
-- e attivo/non attivo. Additiva, nessuna riga esistente viene toccata
-- (colonna nullable).
ALTER TABLE public.price_lists
  ADD COLUMN description text;
