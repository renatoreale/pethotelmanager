-- ============================================================
-- Cancellazione automatica dei dati di prova alla scadenza del
-- trial (Fase 3). Additiva e sicura anche se applicata subito:
--   - nuova colonna nullable, nessuna riga esistente cambia stato
--   - la funzione di pulizia agisce SOLO su tenant is_trial = true,
--     con nome che termina per "TRIAL" e con un solo trial_registrations
--     associato: non tocca mai "la-zampa-felice" ne' alcun tenant reale
--   - il tenant NON viene mai eliminato: viene solo svuotato dei
--     dati operativi. trial_registrations e trial_activity_log
--     restano intatti per sempre (storico/reportistica funnel)
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_purged_at timestamptz;

-- ------------------------------------------------------------
-- Svuota SOLO i dati operativi di un singolo tenant (stessa lista
-- di tabelle di delete_tenant_cascade, escluse pero' trial_registrations,
-- trial_activity_log, audit_log e la riga tenants stessa, che vanno
-- mantenute). Il chiamante (cleanup-expired-trials) e' responsabile
-- di verificare che _tenant_id sia davvero un tenant di prova scaduto
-- e non convertito PRIMA di chiamare questa funzione.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_trial_tenant_data(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.cancellation_policy_rules WHERE policy_id IN (SELECT id FROM public.cancellation_policies WHERE tenant_id = _tenant_id);
  DELETE FROM public.payments WHERE tenant_id = _tenant_id;
  DELETE FROM public.appointments WHERE tenant_id = _tenant_id;
  DELETE FROM public.booking_cats WHERE booking_id IN (SELECT id FROM public.bookings WHERE tenant_id = _tenant_id);
  DELETE FROM public.cat_registry WHERE tenant_id = _tenant_id;
  DELETE FROM public.documents WHERE tenant_id = _tenant_id;
  DELETE FROM public.bookings WHERE tenant_id = _tenant_id;
  DELETE FROM public.quote_requests WHERE tenant_id = _tenant_id;
  DELETE FROM public.cats WHERE tenant_id = _tenant_id;
  DELETE FROM public.clients WHERE tenant_id = _tenant_id;
  DELETE FROM public.cancellation_policies WHERE tenant_id = _tenant_id;
  DELETE FROM public.cage_overrides WHERE tenant_id = _tenant_id;
  DELETE FROM public.email_log WHERE tenant_id = _tenant_id;
  DELETE FROM public.payment_methods WHERE tenant_id = _tenant_id;
  DELETE FROM public.payment_split_configs WHERE tenant_id = _tenant_id;
  DELETE FROM public.planning_tasks WHERE tenant_id = _tenant_id;
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  DELETE FROM public.slot_configs WHERE tenant_id = _tenant_id;
  DELETE FROM public.role_permissions WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenant_stripe_keys WHERE tenant_id = _tenant_id;
  DELETE FROM public.booking_counters WHERE tenant_id = _tenant_id;
  DELETE FROM public.user_roles WHERE tenant_id = _tenant_id;
  UPDATE public.profiles SET tenant_id = NULL WHERE tenant_id = _tenant_id;

  -- Il tenant resta (nome, is_trial, ecc.) ma marcato come svuotato,
  -- cosi' trial_registrations/audit_log possono continuare a
  -- referenziarlo per lo storico senza violare i vincoli di FK.
  UPDATE public.tenants SET trial_purged_at = now() WHERE id = _tenant_id;
END;
$$;
