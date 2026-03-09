import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Global Slot Configs (tenant_id IS NULL) ──
export function useGlobalSlotConfigs() {
  return useQuery({
    queryKey: ["global-slot-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slot_configs")
        .select("*")
        .is("tenant_id", null)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertGlobalSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: {
      id?: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      slot_duration_minutes?: number;
      max_appointments?: number;
      is_active?: boolean;
      appointment_type?: string;
    }) => {
      if (slot.id) {
        const { id, ...rest } = slot;
        const { data, error } = await supabase
          .from("slot_configs")
          .update({ ...rest, tenant_id: null } as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("slot_configs")
          .insert({ ...slot, tenant_id: null } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-slot-configs"] }),
  });
}

export function useDeleteGlobalSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("slot_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-slot-configs"] }),
  });
}

// ── Global Price Lists (tenant_id IS NULL) ──
export function useGlobalPriceLists() {
  return useQuery({
    queryKey: ["global-price-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_lists")
        .select("*")
        .is("tenant_id", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertGlobalPriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (price: {
      id?: string;
      name: string;
      tariff_type: "stagionale" | "extra_giornaliero" | "extra_km" | "extra_una_tantum";
      season?: string | null;
      price_per_day?: number;
      fixed_cost?: number;
      included_km?: number;
      extra_km_cost?: number;
      extra_cat_supplement?: number | null;
      valid_from?: string | null;
      valid_to?: string | null;
      is_active?: boolean;
      pet_type?: "gatti" | "cani" | "entrambi" | null;
    }) => {
      if (price.id) {
        const { id, ...rest } = price;
        const { data, error } = await supabase
          .from("price_lists")
          .update({ ...rest, tenant_id: null } as any)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("price_lists")
          .insert({ ...price, tenant_id: null } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-price-lists"] }),
  });
}

export function useDeleteGlobalPriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-price-lists"] }),
  });
}

// ── Global Payment Methods (tenant_id IS NULL) ──
export function useGlobalPaymentMethods() {
  return useQuery({
    queryKey: ["global-payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .is("tenant_id", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertGlobalPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (method: {
      id?: string;
      name: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      if (method.id) {
        const { id, ...rest } = method;
        const { data, error } = await supabase
          .from("payment_methods")
          .update({ ...rest, tenant_id: null })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("payment_methods")
          .insert({ ...method, tenant_id: null } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-payment-methods"] }),
  });
}

export function useDeleteGlobalPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-payment-methods"] }),
  });
}
