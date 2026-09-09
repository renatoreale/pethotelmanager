-- Blocco 33 (Sicurezza): irrobustisce le funzioni SECURITY DEFINER trovate
-- esposte via RPC senza controlli di autorizzazione interni. Nessuna di
-- queste modifiche cambia il comportamento per chi le usa correttamente
-- oggi (edge function con service role, o utente che agisce sul proprio
-- tenant) — restringe solo l'accesso indebito.

-- ============================================================
-- CRITICO: funzioni distruttive/di scrittura massiva mai chiamate
-- dal frontend né dalle edge function, ma raggiungibili da chiunque
-- (anche senza login) via /rest/v1/rpc/<nome>. Tolto l'accesso
-- diretto: restano utilizzabili dalla service role (usata dalle
-- edge function), che non è toccata da queste REVOKE.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.delete_tenant_cascade(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_trial_tenant_data(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_trial_demo_data(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_diario() FROM anon, authenticated;

-- ============================================================
-- ALTO: funzioni chiamate dal frontend passando il proprio tenant_id,
-- ma senza verifica interna che il chiamante appartenga davvero a
-- quel tenant — un utente autenticato di qualsiasi pensione poteva
-- passare un tenant_id diverso dal proprio. Aggiunto un controllo
-- interno; tolto anche l'accesso da anon (mai necessario: sono azioni
-- di uno staff già loggato).
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.reset_tenant_slot_configs(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_price_lists(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_payment_methods(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_tenant_cancellation_policy(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.copy_global_templates_to_tenant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_preventivi(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.reset_tenant_slot_configs(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR _tenant_id = get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato per questo tenant';
  END IF;
  DELETE FROM public.slot_configs WHERE tenant_id = _tenant_id;
  INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
  SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
  FROM public.slot_configs WHERE tenant_id IS NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.reset_tenant_price_lists(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR _tenant_id = get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato per questo tenant';
  END IF;
  DELETE FROM public.price_lists WHERE tenant_id = _tenant_id;
  INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type)
  SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km, extra_km_cost, cage_pool_type, pet_type
  FROM public.price_lists WHERE tenant_id IS NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.reset_tenant_payment_methods(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR _tenant_id = get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato per questo tenant';
  END IF;
  DELETE FROM public.payment_methods WHERE tenant_id = _tenant_id;
  INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
  SELECT _tenant_id, name, is_active, sort_order FROM public.payment_methods WHERE tenant_id IS NULL;
END; $function$;

CREATE OR REPLACE FUNCTION public.reset_tenant_cancellation_policy(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _global_policy_id uuid; _new_policy_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR _tenant_id = get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Non autorizzato per questo tenant';
  END IF;
  DELETE FROM public.cancellation_policies WHERE tenant_id = _tenant_id;
  SELECT id INTO _global_policy_id FROM public.cancellation_policies WHERE tenant_id IS NULL LIMIT 1;
  IF _global_policy_id IS NOT NULL THEN
    INSERT INTO public.cancellation_policies (tenant_id, admin_fee)
    SELECT _tenant_id, admin_fee FROM public.cancellation_policies WHERE id = _global_policy_id
    RETURNING id INTO _new_policy_id;
    INSERT INTO public.cancellation_policy_rules (policy_id, days_before_checkin, refund_percentage)
    SELECT _new_policy_id, days_before_checkin, refund_percentage
    FROM public.cancellation_policy_rules WHERE policy_id = _global_policy_id;
  END IF;
END; $function$;

-- copy_global_templates_to_tenant è chiamata sia dal pannello admin (utente
-- autenticato, sempre admin: la pagina Admin.tsx è già bloccata dietro
-- hasRole("admin")) sia dalle edge function di provisioning trial (service
-- role, auth.uid() IS NULL in quel contesto: nessun utente-JWT associato).
CREATE OR REPLACE FUNCTION public.copy_global_templates_to_tenant(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    _global_policy_id uuid;
    _new_policy_id uuid;
  BEGIN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Non autorizzato';
    END IF;

    INSERT INTO public.slot_configs (tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type)
    SELECT _tenant_id, day_of_week, start_time, end_time, slot_duration_minutes, max_appointments, is_active, appointment_type
    FROM public.slot_configs WHERE tenant_id IS NULL;

    INSERT INTO public.payment_methods (tenant_id, name, is_active, sort_order)
    SELECT _tenant_id, name, is_active, sort_order
    FROM public.payment_methods WHERE tenant_id IS NULL;

    INSERT INTO public.price_lists (tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost,
  included_km, extra_km_cost, cage_pool_type, pet_type)
    SELECT _tenant_id, name, tariff_type, season, price_per_day, extra_cat_supplement, is_active, valid_from, valid_to, fixed_cost, included_km,
  extra_km_cost, cage_pool_type, pet_type
    FROM public.price_lists WHERE tenant_id IS NULL;

    SELECT id INTO _global_policy_id FROM public.cancellation_policies WHERE tenant_id IS NULL LIMIT 1;
    IF _global_policy_id IS NOT NULL THEN
      INSERT INTO public.cancellation_policies (tenant_id, admin_fee)
      SELECT _tenant_id, admin_fee FROM public.cancellation_policies WHERE id = _global_policy_id
      RETURNING id INTO _new_policy_id;
      INSERT INTO public.cancellation_policy_rules (policy_id, days_before_checkin, refund_percentage)
      SELECT _new_policy_id, days_before_checkin, refund_percentage
      FROM public.cancellation_policy_rules WHERE policy_id = _global_policy_id;
    END IF;
  END;
  $function$;

-- expire_preventivi: tolta la possibilità (mai usata dal codice, ma
-- presente per via del default) di far scadere i preventivi di TUTTE le
-- pensioni con una singola chiamata senza permessi. Un admin può ancora
-- passare esplicitamente NULL o un tenant_id qualsiasi.
CREATE OR REPLACE FUNCTION public.expire_preventivi(_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    IF _tenant_id IS NULL OR _tenant_id <> get_user_tenant_id(auth.uid()) THEN
      RAISE EXCEPTION 'Non autorizzato per questo tenant';
    END IF;
  END IF;

  UPDATE bookings b SET status = 'scaduto', updated_at = now()
  FROM tenants t
  WHERE b.tenant_id = t.id AND b.status = 'preventivo'
    AND b.created_at::date + t.preventivo_validity_days < CURRENT_DATE
    AND (_tenant_id IS NULL OR b.tenant_id = _tenant_id);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $function$;

-- ============================================================
-- Hardening minore: 2 funzioni trigger senza search_path fisso
-- (stesso comportamento, solo più robuste contro un search_path
-- manomesso).
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_bck_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.bck := 'N';
  ELSIF TG_OP = 'UPDATE'
    AND NEW.bck IS NOT DISTINCT FROM OLD.bck
    AND NEW.dt_bck IS NOT DISTINCT FROM OLD.dt_bck
  THEN
    NEW.bck := 'N';
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- Le due funzioni trigger SECURITY DEFINER (fn_audit_row, handle_new_user)
-- non hanno alcun uso legittimo se chiamate direttamente via RPC (servono
-- solo come trigger su INSERT/UPDATE/DELETE e su auth.users). Tolto
-- l'accesso diretto.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.fn_audit_row() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
