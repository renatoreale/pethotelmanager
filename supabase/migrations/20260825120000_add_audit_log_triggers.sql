-- Sistema di audit generico: registra ogni INSERT/UPDATE/DELETE sulle tabelle
-- operative nella tabella audit_log gia' esistente (prima vuota, nessun trigger
-- la popolava). Usa to_jsonb(OLD/NEW) cosi' before_data/after_data si adattano
-- automaticamente a future modifiche di schema, senza bisogno di duplicare le tabelle.

CREATE OR REPLACE FUNCTION public.fn_audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _record_id uuid;
  _user_role text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _tenant_id := (to_jsonb(OLD)->>'tenant_id')::uuid;
    _record_id := (to_jsonb(OLD)->>'id')::uuid;
  ELSE
    _tenant_id := (to_jsonb(NEW)->>'tenant_id')::uuid;
    _record_id := (to_jsonb(NEW)->>'id')::uuid;
  END IF;

  SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.audit_log (
    tenant_id, table_name, operation, record_id, user_id, user_role, before_data, after_data
  ) VALUES (
    _tenant_id,
    TG_TABLE_NAME,
    TG_OP::public.audit_operation,
    _record_id,
    auth.uid(),
    _user_role,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN NULL;
END;
$$;

-- Applica il trigger alle tabelle operative principali.
-- Escluse volutamente: audit_log stessa, booking_counters (contatore ad alta
-- frequenza, nessun valore informativo), e le tabelle di solo log/telemetria
-- (email_log, email_send_log, email_send_state, email_unsubscribe_tokens,
-- suppressed_emails, demo_leads, landing_config, trial_activity_log,
-- trial_registrations) che sono gia' esse stesse dei log.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'cats', 'cat_registry',
    'bookings', 'booking_cats', 'appointments', 'cage_overrides',
    'quote_requests', 'documents', 'planning_tasks',
    'payments', 'payment_methods', 'payment_split_configs', 'price_lists',
    'cancellation_policies', 'cancellation_policy_rules', 'slot_configs',
    'profiles', 'user_roles', 'tenants', 'tenant_stripe_keys', 'system_config'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;
         CREATE TRIGGER trg_audit_%I
           AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row();',
        t, t, t, t
      );
    END IF;
  END LOOP;
END $$;
