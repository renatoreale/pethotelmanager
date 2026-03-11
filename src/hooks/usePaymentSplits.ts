import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface PaymentSplitConfig {
  id: string;
  tenant_id: string;
  label: string;
  percentage: number;
  payment_moment: string;
  sort_order: number;
  payment_method_note: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentSplits() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["payment-splits", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payment_split_configs")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentSplitConfig[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useUpsertPaymentSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (split: {
      id?: string;
      tenant_id: string;
      label: string;
      percentage: number;
      payment_moment: string;
      sort_order?: number;
      payment_method_note?: string | null;
    }) => {
      if (split.id) {
        const { id, ...rest } = split;
        const { data, error } = await supabase
          .from("payment_split_configs")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("payment_split_configs")
          .insert(split)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-splits"] }),
  });
}

export function useDeletePaymentSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_split_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-splits"] }),
  });
}
