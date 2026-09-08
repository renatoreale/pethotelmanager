-- Semi dei permessi globali (tenant_id NULL = default per tutti i tenant)
-- per le due nuove risorse "prezzi" e "documenti", allineati esattamente
-- alle RLS appena introdotte su price_lists/payments/documents e al
-- fallback lato frontend (usePermissions.ts).
INSERT INTO public.role_permissions (role, resource, can_read, can_write, can_delete, is_visible, tenant_id)
VALUES
  ('admin', 'prezzi', true, true, true, true, NULL),
  ('ceo', 'prezzi', true, false, false, true, NULL),
  ('titolare', 'prezzi', true, true, true, true, NULL),
  ('manager', 'prezzi', true, true, false, true, NULL),
  ('operatore', 'prezzi', false, false, false, false, NULL),
  ('admin', 'documenti', true, true, true, true, NULL),
  ('ceo', 'documenti', true, false, false, true, NULL),
  ('titolare', 'documenti', true, true, true, true, NULL),
  ('manager', 'documenti', true, true, false, true, NULL),
  ('operatore', 'documenti', true, true, false, true, NULL)
ON CONFLICT DO NOTHING;
