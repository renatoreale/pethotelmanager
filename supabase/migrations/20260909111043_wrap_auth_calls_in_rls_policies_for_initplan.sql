-- Blocco 35 (Performance): l'advisor auth_rls_initplan segnalava ~90 policy
-- RLS che chiamano auth.uid()/auth.role()/auth.jwt() senza avvolgerle in
-- (select ...), causando la rivalutazione della funzione per OGNI riga
-- invece che una sola volta per query. Fix ufficiale raccomandato da
-- Supabase per questo avviso. Nessun cambio di semantica: auth.uid() e le
-- funzioni helper dell'app (has_role, get_user_tenant_id, get_client_id,
-- is_client) sono tutte STABLE (verificato via pg_proc.provolatile prima di
-- procedere) — per contratto del linguaggio, garantiscono lo stesso
-- risultato per l'intera durata di una query, quindi valutarle una volta
-- invece che per riga non cambia in alcun modo il risultato della policy.
--
-- Generato ed eseguito da Postgres stesso (DO block con EXECUTE dinamico),
-- non trascritto a mano, per azzerare il rischio di errori di trascrizione
-- su una modifica così estesa.
DO $$
DECLARE
  r RECORD;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ~ 'auth\.(uid|role|jwt)\(\)' OR with_check ~ 'auth\.(uid|role|jwt)\(\)')
  LOOP
    stmt := 'ALTER POLICY ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    IF r.qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || regexp_replace(r.qual, 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') || ')';
    END IF;
    IF r.with_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || regexp_replace(r.with_check, 'auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'g') || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;
