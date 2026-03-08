import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export function usePaymentMethods() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["payment-methods", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useAllPaymentMethods() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["payment-methods-all", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order?: number }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({ ...input, tenant_id: profile.tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
    },
  });
}

export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
    },
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
    },
  });
}

export interface Payment {
  id: string;
  booking_id: string;
  tenant_id: string;
  amount: number;
  payment_type: "caparra" | "saldo" | "extra" | "rimborso";
  payment_date: string;
  payment_method_id: string | null;
  method: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  payment_method?: PaymentMethod;
}

export function useBookingPayments(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*, payment_method:payment_methods(id, name)")
        .eq("booking_id", bookingId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Payment[];
    },
    enabled: !!bookingId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      booking_id: string;
      amount: number;
      payment_type: "caparra" | "saldo" | "extra" | "rimborso";
      payment_date: string;
      payment_method_id: string;
      notes?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
    },
  });
}
