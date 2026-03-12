import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useQuoteRequests() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["quote-requests", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*, client:clients(first_name, last_name, email, phone)")
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["pending", "reviewed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useUpdateQuoteRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const update: any = { status };
      if (rejection_reason !== undefined) update.rejection_reason = rejection_reason;
      const { error } = await supabase
        .from("quote_requests")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-requests"] }),
  });
}
