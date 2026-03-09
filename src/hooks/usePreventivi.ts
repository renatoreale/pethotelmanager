import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface Preventivo {
  id: string;
  booking_number: string;
  tenant_id: string;
  client_id: string;
  cage_pool_type: "singola" | "doppia";
  units_occupied: number;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  deposit_amount: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  price_breakdown: any;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  booking_cats?: {
    id: string;
    cat_id: string;
    cat?: { id: string; name: string };
  }[];
}

// Get next booking number from DB function
async function getNextBookingNumber(tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc("next_booking_number", {
    _tenant_id: tenantId,
  });
  if (error) throw error;
  return data as string;
}

export function usePreventivi() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["preventivi", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          booking_cats(id, cat_id, cat:cats(id, name))
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "preventivo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Preventivo[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreatePreventivo() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      cage_pool_type: "singola" | "doppia";
      units_occupied?: number;
      check_in_date: string;
      check_out_date: string;
      total_amount?: number;
      deposit_amount?: number;
      notes?: string;
      cat_ids: string[];
      price_breakdown?: any;
      pet_type?: "gatti" | "cani" | "entrambi" | null;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { cat_ids, ...booking } = input;

      const bookingNumber = await getNextBookingNumber(profile.tenant_id);

      // Insert booking
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          ...booking,
          tenant_id: profile.tenant_id,
          booking_number: bookingNumber,
          status: "preventivo" as const,
          created_by: user?.id ?? null,
          units_occupied: booking.units_occupied ?? 1,
          total_amount: booking.total_amount ?? 0,
          deposit_amount: booking.deposit_amount ?? 0,
        } as any)
        .select()
        .single();
      if (bookingError) throw bookingError;

      // Insert booking_cats
      if (cat_ids.length > 0) {
        const { error: catsError } = await supabase
          .from("booking_cats")
          .insert(cat_ids.map((cat_id) => ({
            booking_id: newBooking.id,
            cat_id,
          })));
        if (catsError) throw catsError;
      }

      return newBooking;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preventivi"] }),
  });
}

export function useUpdatePreventivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      client_id?: string;
      cage_pool_type?: "singola" | "doppia";
      units_occupied?: number;
      check_in_date?: string;
      check_out_date?: string;
      total_amount?: number;
      deposit_amount?: number;
      notes?: string;
      cat_ids?: string[];
      price_breakdown?: any;
    }) => {
      const { id, cat_ids, ...updates } = input;

      const { data, error } = await supabase
        .from("bookings")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Update cats if provided
      if (cat_ids !== undefined) {
        // Delete existing
        await supabase.from("booking_cats").delete().eq("booking_id", id);
        // Re-insert
        if (cat_ids.length > 0) {
          const { error: catsError } = await supabase
            .from("booking_cats")
            .insert(cat_ids.map((cat_id) => ({ booking_id: id, cat_id })));
          if (catsError) throw catsError;
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-range"] });
      qc.invalidateQueries({ queryKey: ["appointments-all"] });
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
    },
  });
}

export function useDeletePreventivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete cats first
      await supabase.from("booking_cats").delete().eq("booking_id", id);
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preventivi"] }),
  });
}

export function useConfirmPreventivo() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      deposit: {
        amount: number;
        payment_date: string;
        payment_method_id: string;
        notes?: string;
      };
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");

      // 1. Update booking status and actual deposit
      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "confermata" as const,
          deposit_amount: input.deposit.amount,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;

      // 2. Register deposit payment
      const { error: payError } = await supabase
        .from("payments")
        .insert({
          booking_id: input.id,
          tenant_id: profile.tenant_id,
          amount: input.deposit.amount,
          payment_type: "caparra" as const,
          payment_date: input.deposit.payment_date,
          payment_method_id: input.deposit.payment_method_id,
          notes: input.deposit.notes ?? null,
          created_by: user?.id ?? null,
        });
      if (payError) throw payError;

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
    },
  });
}

// Fetch cats by client_id
export function useClientCats(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-cats", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("cats")
        .select("id, name, needs_double_cage, pet_type")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}
