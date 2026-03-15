import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

export interface DbConfig {
  mode: "cloud" | "external";
  external_url: string;
  external_anon_key: string;
}

const DEFAULT_CONFIG: DbConfig = {
  mode: "cloud",
  external_url: "",
  external_anon_key: "",
};

export function useDbConfig() {
  return useQuery({
    queryKey: ["db-config"],
    queryFn: async (): Promise<DbConfig> => {
      const { data, error } = await supabase
        .from("system_config" as any)
        .select("value")
        .eq("key", "db_mode")
        .single();
      if (error || !data) return DEFAULT_CONFIG;
      return (data as any).value as DbConfig;
    },
  });
}

export function useUpdateDbConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: DbConfig) => {
      const { error } = await supabase
        .from("system_config" as any)
        .update({ value: config as any, updated_at: new Date().toISOString() })
        .eq("key", "db_mode");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["db-config"] });
      toast.success("Configurazione database salvata");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useTestExternalConnection() {
  return useMutation({
    mutationFn: async ({ url, anonKey }: { url: string; anonKey: string }) => {
      const client = createClient(url, anonKey);
      // Try a simple health check - select from a system table
      const { error } = await client.from("tenants").select("id").limit(1);
      if (error) throw new Error(`Connessione fallita: ${error.message}`);
      return true;
    },
  });
}

/**
 * Returns the appropriate Supabase client based on the current db_mode config.
 * Falls back to the default Lovable Cloud client.
 */
let externalClientCache: { url: string; key: string; client: ReturnType<typeof createClient> } | null = null;

export function getExternalClient(url: string, anonKey: string) {
  if (externalClientCache && externalClientCache.url === url && externalClientCache.key === anonKey) {
    return externalClientCache.client;
  }
  const client = createClient(url, anonKey, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
  externalClientCache = { url, key: anonKey, client };
  return client;
}
