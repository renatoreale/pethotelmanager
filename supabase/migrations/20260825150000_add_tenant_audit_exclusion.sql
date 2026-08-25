-- Permette di escludere pensioni specifiche dall'audit (es. tenant di test/demo)
-- tramite un flag sul tenant, invece di hardcodare ID nel trigger.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS audit_excluded boolean NOT NULL DEFAULT false;

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

  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE'
     AND (to_jsonb(OLD) - 'tenant_id' - 'updated_at') = (to_jsonb(NEW) - 'tenant_id' - 'updated_at') THEN
    RETURN NULL;
  END IF;

  IF _tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tenants WHERE id = _tenant_id AND audit_excluded
  ) THEN
    RETURN NULL;
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

-- Verifica quali pensioni corrispondono prima di eseguire l'UPDATE sotto:
-- SELECT id, name FROM public.tenants
-- WHERE name ILIKE '%gattosereno%' OR name ILIKE '%zampa felice%' OR name ILIKE '%admin%';

UPDATE public.tenants SET audit_excluded = true
WHERE name ILIKE '%gattosereno%' OR name ILIKE '%zampa felice%' OR name ILIKE '%admin%';
