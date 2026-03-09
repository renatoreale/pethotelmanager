import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ── Tenant config (casette) ──
export function useTenantConfig() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["tenant-config", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, num_singole, num_doppie, max_cats, occupancy_rule_days, email, phone, address, cap, city, stay_calc_type, count_checkin_day, count_checkout_day, partita_iva, pec, titolare_name, logo_url")
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
      max_cats?: number;
      occupancy_rule_days?: number;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      cap?: string | null;
      city?: string | null;
      stay_calc_type?: string;
      count_checkin_day?: boolean;
      count_checkout_day?: boolean;
      partita_iva?: string | null;
      pec?: string | null;
      titolare_name?: string | null;
      logo_url?: string | null;
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
      appointment_type?: string;
    }) => {
      if (slot.id) {
        const { id, ...rest } = slot;
        const { data, error } = await supabase.from("slot_configs").update(rest as any).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("slot_configs").insert(slot as any).select().single();
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

// ── Price lists (tariffe) ──
export type TariffType = "stagionale" | "extra_giornaliero" | "extra_km" | "extra_una_tantum";

export function usePriceLists() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["price-lists", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_lists")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
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
      tariff_type: TariffType;
      season?: string | null;
      price_per_day?: number;
      fixed_cost?: number;
      included_km?: number;
      extra_km_cost?: number;
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
