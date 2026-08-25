import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | "RESTORE";
  record_id: string;
  user_id: string | null;
  user_role: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  created_at: string;
  operation_id: string | null;
}

export interface AuditLogFilters {
  tableName: string;
  operation: string;
  recordId: string;
  tenantId: string;
  limit: number;
}

export function useAuditLog(filters: AuditLogFilters) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit);
      if (filters.tableName) query = query.eq("table_name", filters.tableName);
      if (filters.operation) query = query.eq("operation", filters.operation as any);
      if (filters.tenantId) query = query.eq("tenant_id", filters.tenantId);
      const recordId = filters.recordId.trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId)) {
        query = query.eq("record_id", recordId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AuditLogEntry[];
    },
  });
}

// Altre righe (su altre tabelle) scritte nella stessa transazione/operazione
export function useAuditLogSiblings(operationId: string | null, excludeId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["audit-log-siblings", operationId, excludeId],
    queryFn: async () => {
      if (!operationId) return [];
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("operation_id", operationId)
        .neq("id", excludeId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as AuditLogEntry[];
    },
    enabled: !!operationId && !!excludeId,
  });
}

export function useRestoreAuditRecord() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auditLogId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-restore-audit-record", {
        body: { audit_log_id: auditLogId },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (!data?.success) throw new Error("Ripristino non riuscito");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit-log"] }),
  });
}
