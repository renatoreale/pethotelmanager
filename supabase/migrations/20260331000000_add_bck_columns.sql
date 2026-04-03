-- Add bck and dt_bck columns to all tables (skips tables that don't exist)
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
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS bck varchar(1) NOT NULL DEFAULT ''N'', ADD COLUMN IF NOT EXISTS dt_bck timestamp',
        t
      );
    END IF;
  END LOOP;
END $$;
