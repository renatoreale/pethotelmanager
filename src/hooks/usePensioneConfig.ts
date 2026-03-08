import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ── Tenant config (gabbie) ──
export function useTenantConfig() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["tenant-config", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, num_singole, num_doppie, occupancy_rule_days, email, phone, address")
        .eq("id", profile.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useUpdateTenantConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      id: string;
      num_singole?: number;
      num_doppie?: number;
      occupancy_rule_days?: number;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("tenants")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-config"] }),
  });
}

// ── Slot configs ──
export function useSlotConfigs() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["slot-configs", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("slot_configs")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useUpsertSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: {
      id?: string;
      tenant_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes?: number;
      max_appointments?: number;
      is_active?: boolean;
    }) => {
      if (slot.id) {
        const { id, ...rest } = slot;
        const { data, error } = await supabase.from("slot_configs").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("slot_configs").insert(slot).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slot-configs"] }),
  });
}

export function useDeleteSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("slot_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slot-configs"] }),
  });
}

// ── Price lists ──
export function usePriceLists() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["price-lists", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_lists")
        .select("*")
        .or(`tenant_id.is.null,tenant_id.eq.${profile?.tenant_id}`)
        .order("cage_pool_type")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useUpsertPriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (price: {
      id?: string;
      tenant_id?: string | null;
      name: string;
      cage_pool_type: "singola" | "doppia";
      price_per_day: number;
      extra_cat_supplement?: number | null;
      valid_from?: string | null;
      valid_to?: string | null;
      is_active?: boolean;
    }) => {
      if (price.id) {
        const { id, ...rest } = price;
        const { data, error } = await supabase.from("price_lists").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("price_lists").insert(price).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}

export function useDeletePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-lists"] }),
  });
}
