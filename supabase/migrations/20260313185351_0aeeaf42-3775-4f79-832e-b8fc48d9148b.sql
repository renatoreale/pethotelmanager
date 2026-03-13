
CREATE OR REPLACE FUNCTION public.delete_tenant_cascade(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Delete deepest FK children first
  -- cancellation_policy_rules (via policy_id)
  DELETE FROM public.cancellation_policy_rules
  WHERE policy_id IN (SELECT id FROM public.cancellation_policies WHERE tenant_id = _tenant_id);

  -- payments, appointments, booking_cats, cat_registry, documents (via booking_id)
  DELETE FROM public.payments WHERE tenant_id = _tenant_id;
  DELETE FROM public.appointments WHERE tenant_id = _tenant_id;
  DELETE FROM public.booking_cats
  WHERE booking_id IN (SELECT id FROM public.bookings WHERE tenant_id = _tenant_id);
  DELETE FROM public.cat_registry WHERE tenant_id = _tenant_id;
  DELETE FROM public.documents WHERE tenant_id = _tenant_id;

  -- 2. bookings
  DELETE FROM public.bookings WHERE tenant_id = _tenant_id;

  -- 3. quote_requests, cats, clients
  DELETE FROM public.quote_requests WHERE tenant_id = _tenant_id;
  DELETE FROM public.cats WHERE tenant_id = _tenant_id;
  DELETE FROM public.clients WHERE tenant_id = _tenant_id;

  -- 4. Config tables
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

  -- 5. User-level: trial_activity_log, trial_registrations, audit_log
  DELETE FROM public.trial_activity_log
  WHERE trial_id IN (SELECT id FROM public.trial_registrations WHERE tenant_id = _tenant_id);
  DELETE FROM public.trial_registrations WHERE tenant_id = _tenant_id;
  DELETE FROM public.audit_log WHERE tenant_id = _tenant_id;

  -- 6. Profiles and user_roles (don't delete auth users, just unlink)
  UPDATE public.profiles SET tenant_id = NULL WHERE tenant_id = _tenant_id;
  DELETE FROM public.user_roles WHERE tenant_id = _tenant_id;

  -- 7. Finally delete the tenant
  DELETE FROM public.tenants WHERE id = _tenant_id;
END;
$$;
