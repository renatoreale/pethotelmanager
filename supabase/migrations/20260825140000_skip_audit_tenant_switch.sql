-- Non registrare nell'audit il semplice cambio di pensione attiva
-- (profiles.tenant_id), che e' uno stato di navigazione dell'utente, non
-- una modifica di dati di business. Continua a loggare normalmente se
-- insieme al tenant_id cambia anche qualcos'altro (es. full_name).

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
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE'
     AND (to_jsonb(OLD) - 'tenant_id' - 'updated_at') = (to_jsonb(NEW) - 'tenant_id' - 'updated_at') THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    _tenant_id := (to_jsonb(OLD)->>'tenant_id')::uuid;
    _record_id := (to_jsonb(OLD)->>'id')::uuid;
  ELSE
    _tenant_id := (to_jsonb(NEW)->>'tenant_id')::uuid;
    _record_id := (to_jsonb(NEW)->>'id')::uuid;
  END IF;

  SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.audit_log (
    tenant_id, table_name, operation, record_id, user_id, user_role, before_data, after_data, operation_id
  ) VALUES (
    _tenant_id,
    TG_TABLE_NAME,
    TG_OP::public.audit_operation,
    _record_id,
    auth.uid(),
    _user_role,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    pg_current_xact_id()
  );

  RETURN NULL;
END;
$$;
