-- Recreate all bck triggers explicitly, one per table (same as clients)

DROP TRIGGER IF EXISTS trg_bck_appointments ON public.appointments;
CREATE TRIGGER trg_bck_appointments
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_audit_log ON public.audit_log;
CREATE TRIGGER trg_bck_audit_log
  BEFORE INSERT OR UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_booking_cats ON public.booking_cats;
CREATE TRIGGER trg_bck_booking_cats
  BEFORE INSERT OR UPDATE ON public.booking_cats
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_booking_counters ON public.booking_counters;
CREATE TRIGGER trg_bck_booking_counters
  BEFORE INSERT OR UPDATE ON public.booking_counters
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_bookings ON public.bookings;
CREATE TRIGGER trg_bck_bookings
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_cage_overrides ON public.cage_overrides;
CREATE TRIGGER trg_bck_cage_overrides
  BEFORE INSERT OR UPDATE ON public.cage_overrides
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_cancellation_policies ON public.cancellation_policies;
CREATE TRIGGER trg_bck_cancellation_policies
  BEFORE INSERT OR UPDATE ON public.cancellation_policies
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_cancellation_policy_rules ON public.cancellation_policy_rules;
CREATE TRIGGER trg_bck_cancellation_policy_rules
  BEFORE INSERT OR UPDATE ON public.cancellation_policy_rules
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_cat_registry ON public.cat_registry;
CREATE TRIGGER trg_bck_cat_registry
  BEFORE INSERT OR UPDATE ON public.cat_registry
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_cats ON public.cats;
CREATE TRIGGER trg_bck_cats
  BEFORE INSERT OR UPDATE ON public.cats
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_clients ON public.clients;
CREATE TRIGGER trg_bck_clients
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_demo_leads ON public.demo_leads;
CREATE TRIGGER trg_bck_demo_leads
  BEFORE INSERT OR UPDATE ON public.demo_leads
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_documents ON public.documents;
CREATE TRIGGER trg_bck_documents
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_email_log ON public.email_log;
CREATE TRIGGER trg_bck_email_log
  BEFORE INSERT OR UPDATE ON public.email_log
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_email_send_log ON public.email_send_log;
CREATE TRIGGER trg_bck_email_send_log
  BEFORE INSERT OR UPDATE ON public.email_send_log
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_email_send_state ON public.email_send_state;
CREATE TRIGGER trg_bck_email_send_state
  BEFORE INSERT OR UPDATE ON public.email_send_state
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_email_templates ON public.email_templates;
CREATE TRIGGER trg_bck_email_templates
  BEFORE INSERT OR UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_email_unsubscribe_tokens ON public.email_unsubscribe_tokens;
CREATE TRIGGER trg_bck_email_unsubscribe_tokens
  BEFORE INSERT OR UPDATE ON public.email_unsubscribe_tokens
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_landing_config ON public.landing_config;
CREATE TRIGGER trg_bck_landing_config
  BEFORE INSERT OR UPDATE ON public.landing_config
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_payment_methods ON public.payment_methods;
CREATE TRIGGER trg_bck_payment_methods
  BEFORE INSERT OR UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_payment_split_configs ON public.payment_split_configs;
CREATE TRIGGER trg_bck_payment_split_configs
  BEFORE INSERT OR UPDATE ON public.payment_split_configs
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_payments ON public.payments;
CREATE TRIGGER trg_bck_payments
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_planning_tasks ON public.planning_tasks;
CREATE TRIGGER trg_bck_planning_tasks
  BEFORE INSERT OR UPDATE ON public.planning_tasks
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_price_lists ON public.price_lists;
CREATE TRIGGER trg_bck_price_lists
  BEFORE INSERT OR UPDATE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_profiles ON public.profiles;
CREATE TRIGGER trg_bck_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_quote_requests ON public.quote_requests;
CREATE TRIGGER trg_bck_quote_requests
  BEFORE INSERT OR UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_slot_configs ON public.slot_configs;
CREATE TRIGGER trg_bck_slot_configs
  BEFORE INSERT OR UPDATE ON public.slot_configs
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_suppressed_emails ON public.suppressed_emails;
CREATE TRIGGER trg_bck_suppressed_emails
  BEFORE INSERT OR UPDATE ON public.suppressed_emails
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_system_config ON public.system_config;
CREATE TRIGGER trg_bck_system_config
  BEFORE INSERT OR UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_tenant_stripe_keys ON public.tenant_stripe_keys;
CREATE TRIGGER trg_bck_tenant_stripe_keys
  BEFORE INSERT OR UPDATE ON public.tenant_stripe_keys
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_tenants ON public.tenants;
CREATE TRIGGER trg_bck_tenants
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_trial_activity_log ON public.trial_activity_log;
CREATE TRIGGER trg_bck_trial_activity_log
  BEFORE INSERT OR UPDATE ON public.trial_activity_log
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_trial_registrations ON public.trial_registrations;
CREATE TRIGGER trg_bck_trial_registrations
  BEFORE INSERT OR UPDATE ON public.trial_registrations
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();

DROP TRIGGER IF EXISTS trg_bck_user_roles ON public.user_roles;
CREATE TRIGGER trg_bck_user_roles
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION set_bck_on_update();
