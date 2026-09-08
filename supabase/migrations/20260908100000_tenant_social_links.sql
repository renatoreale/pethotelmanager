-- Link social per pensione, configurabili da Impostazioni Pensione >
-- Anagrafica, mostrati come icone nell'header delle email verso i clienti.
--
-- Impatto: additivo, tutte le colonne nullable — nessuna pensione ha
-- icone social finché il titolare non compila i link.

ALTER TABLE public.tenants
  ADD COLUMN social_facebook_url text,
  ADD COLUMN social_instagram_url text,
  ADD COLUMN social_tiktok_url text,
  ADD COLUMN social_whatsapp_url text;
