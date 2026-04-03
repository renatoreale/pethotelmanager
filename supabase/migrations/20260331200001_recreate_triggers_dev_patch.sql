-- Patch for dev: recreate triggers skipping tables that may not exist
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments', 'audit_log', 'booking_cats', 'booking_counters', 'bookings',
    'cage_overrides', 'cancellation_policies', 'cancellation_policy_rules',
    'cat_registry', 'cats', 'clients', 'demo_leads', 'documents',
    'email_log', 'email_send_log', 'email_send_state', 'email_templates',
    'email_unsubscribe_tokens', 'landing_config', 'payment_methods',
    'payment_split_configs', 'payments', 'planning_tasks', 'price_lists',
    'profiles', 'quote_requests', 'slot_configs', 'suppressed_emails',
    'system_config', 'tenant_stripe_keys', 'tenants', 'trial_activity_log',
    'trial_registrations', 'user_roles'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_bck_%I ON public.%I;
         CREATE TRIGGER trg_bck_%I
           BEFORE INSERT OR UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();',
        t, t, t, t
      );
    END IF;
  END LOOP;
END $$;
