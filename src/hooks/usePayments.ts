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

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ name })
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
  payment_type: "caparra" | "saldo" | "extra" | "rimborso" | "manuale";
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
      qc.invalidateQueries({ queryKey: ["payments-all"] });
      qc.invalidateQueries({ queryKey: ["bookings-with-payments"] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      amount?: number;
      payment_type?: "caparra" | "saldo" | "extra" | "rimborso";
      payment_date?: string;
      payment_method_id?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["payments-all"] });
      qc.invalidateQueries({ queryKey: ["bookings-with-payments"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["payments-all"] });
      qc.invalidateQueries({ queryKey: ["bookings-with-payments"] });
    },
  });
}

export function useAllPayments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["payments-all", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*, payment_method:payment_methods(id, name)")
        .eq("tenant_id", profile.tenant_id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Payment[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useAllBookingsWithPayments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["bookings-with-payments", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          client:clients(id, first_name, last_name),
          booking_cats(id, cat:cats(id, name)),
          payments(id, amount, payment_type, payment_date, payment_method_id, notes, method, payment_method:payment_methods(id, name))
        `)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "preventivo")
        .order("check_in_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
}
