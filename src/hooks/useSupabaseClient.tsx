import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SupabaseClientContextType {
  client: SupabaseClient;
  isExternal: boolean;
  loading: boolean;
}

const SupabaseClientContext = createContext<SupabaseClientContextType>({
  client: baseClient,
  isExternal: false,
  loading: true,
});

let cachedExternalClient: { url: string; key: string; client: SupabaseClient } | null = null;

function getOrCreateExternalClient(url: string, anonKey: string): SupabaseClient {
  if (cachedExternalClient && cachedExternalClient.url === url && cachedExternalClient.key === anonKey) {
    return cachedExternalClient.client;
  }
  const client = createClient(url, anonKey, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
  cachedExternalClient = { url, key: anonKey, client };
  return client;
}

export function SupabaseClientProvider({ children }: { children: ReactNode }) {
  const [activeClient, setActiveClient] = useState<SupabaseClient>(baseClient);
  const [isExternal, setIsExternal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await baseClient
          .from("system_config" as any)
          .select("value")
          .eq("key", "db_mode")
          .single();

        if (!error && data) {
          const config = (data as any).value;
          if (config?.mode === "external" && config.external_url && config.external_anon_key) {
            const extClient = getOrCreateExternalClient(config.external_url, config.external_anon_key);
            setActiveClient(extClient);
            setIsExternal(true);
          } else {
            setActiveClient(baseClient);
            setIsExternal(false);
          }
        }
      } catch {
        // Fallback to base client
        setActiveClient(baseClient);
        setIsExternal(false);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  return (
    <SupabaseClientContext.Provider value={{ client: activeClient, isExternal, loading }}>
      {children}
    </SupabaseClientContext.Provider>
  );
}

/**
 * Returns the dynamically configured Supabase client.
 * Uses external Supabase if configured in admin panel, otherwise Lovable Cloud.
 */
export function useSupabase(): SupabaseClient {
  return useContext(SupabaseClientContext).client;
}

/**
 * Returns the base Lovable Cloud client (always).
 * Use for auth operations and system_config reads.
 */
export function useBaseSupabase(): SupabaseClient {
  return baseClient;
}

export function useSupabaseClientInfo() {
  return useContext(SupabaseClientContext);
}
