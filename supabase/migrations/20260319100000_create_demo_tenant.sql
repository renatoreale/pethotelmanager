-- ============================================================
-- Crea il tenant demo "La Zampa Felice" usato per il trial
-- Idempotente: se esiste già, non fa nulla
-- ============================================================

INSERT INTO public.tenants (
  name,
  slug,
  address,
  phone,
  email,
  num_singole,
  num_doppie,
  occupancy_rule_days,
  pet_type,
  locale
)
SELECT
  'La Zampa Felice',
  'la-zampa-felice',
  'Via Demo 1, Milano',
  '+39 02 0000000',
  'demo@pethotelmanager.com',
  10,
  5,
  4,
  'gatti',
  'it'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenants WHERE slug = 'la-zampa-felice'
);

-- Copia i template globali sul tenant demo (listini, metodi pagamento, ecc.)
DO $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT id INTO _tenant_id FROM public.tenants WHERE slug = 'la-zampa-felice';
  IF _tenant_id IS NOT NULL THEN
    PERFORM public.copy_global_templates_to_tenant(_tenant_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- copy_global_templates_to_tenant potrebbe non esistere o fallire: ignora
    NULL;
END;
$$;
