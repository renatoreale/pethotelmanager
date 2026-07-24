-- I clienti del portale (collegati via clients.user_id, non via profiles/user_roles)
-- non avevano nessuna policy per leggere la propria pensione: il portale cliente
-- (conferma preventivo, download PDF, bonifico bancario) dipende da questi dati.
DROP POLICY IF EXISTS "Clients read own tenant" ON public.tenants;

CREATE POLICY "Clients read own tenant" ON public.tenants
FOR SELECT TO authenticated
USING (
  is_client(auth.uid())
  AND id = (SELECT c.tenant_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1)
);

-- Il portale cliente deve sapere se la pensione ha Stripe configurato per mostrare
-- il pulsante "Paga con Carta", ma non deve MAI poter leggere la chiave segreta
-- Stripe in chiaro. Niente policy di lettura diretta sulla tabella per i clienti:
-- solo questa funzione SECURITY DEFINER che espone un booleano.
CREATE OR REPLACE FUNCTION public.tenant_has_stripe(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_stripe_keys WHERE tenant_id = _tenant_id)
$$;

GRANT EXECUTE ON FUNCTION public.tenant_has_stripe(uuid) TO authenticated;
