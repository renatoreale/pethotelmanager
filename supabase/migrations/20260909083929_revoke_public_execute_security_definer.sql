-- Il REVOKE FROM anon, authenticated della migrazione precedente non basta:
-- queste funzioni erano state create con il grant di default di Postgres a
-- PUBLIC, che anon/authenticated ereditano comunque. Serve togliere anche
-- quello. Le funzioni che devono restare usabili da "authenticated" hanno
-- già un GRANT esplicito separato (verificato via pg_proc.proacl), quindi
-- questa REVOKE non le rompe.

REVOKE EXECUTE ON FUNCTION public.delete_tenant_cascade(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_trial_tenant_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_trial_demo_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_audit_row() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.reset_tenant_slot_configs(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_price_lists(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_payment_methods(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_cancellation_policy(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.copy_global_templates_to_tenant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_preventivi(uuid) FROM PUBLIC;
