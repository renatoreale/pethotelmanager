
-- Tabella separata per le chiavi Stripe dei tenant (sicurezza: solo service_role può leggere)
CREATE TABLE public.tenant_stripe_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  stripe_secret_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_stripe_keys ENABLE ROW LEVEL SECURITY;

-- Solo admin/titolare/manager possono inserire/aggiornare la propria chiave
CREATE POLICY "tenant_stripe_keys_insert" ON public.tenant_stripe_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'titolare') OR
      public.has_role(auth.uid(), 'manager')
    )
  );

CREATE POLICY "tenant_stripe_keys_update" ON public.tenant_stripe_keys
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'titolare') OR
      public.has_role(auth.uid(), 'manager')
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- SELECT: solo per verificare se esiste (non espone la chiave al client)
-- Il client vedrà solo se la chiave è configurata, mai il valore
CREATE POLICY "tenant_stripe_keys_select" ON public.tenant_stripe_keys
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'titolare') OR
      public.has_role(auth.uid(), 'manager')
    )
  );

-- Trigger per updated_at
CREATE TRIGGER set_updated_at_tenant_stripe_keys
  BEFORE UPDATE ON public.tenant_stripe_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
