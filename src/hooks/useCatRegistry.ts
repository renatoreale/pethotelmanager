import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useCatRegistry() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["cat-registry", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("cat_registry" as any)
        .select("*, cats:cat_id(breed, gender), booking:booking_id(check_out_date, check_in_date)")
        .eq("tenant_id", profile.tenant_id)
        .order("check_in_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useInsertCatRegistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: {
      tenant_id: string;
      booking_id: string;
      cat_id: string;
      client_name: string;
      cat_name: string;
      microchip: string | null;
      check_in_date: string;
    }[]) => {
      const { data, error } = await supabase
        .from("cat_registry" as any)
        .insert(entries as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cat-registry"] });
    },
  });
}

export function useUpdateCatRegistryCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, checkOutDate, reason }: { bookingId: string; checkOutDate: string; reason?: string }) => {
      const { error } = await supabase
        .from("cat_registry" as any)
        .update({ check_out_date: checkOutDate, reason: reason ?? null } as any)
        .eq("booking_id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cat-registry"] });
    },
  });
}
