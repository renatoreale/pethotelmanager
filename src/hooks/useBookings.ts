import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface Booking {
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
  appointments?: {
    id: string;
    appointment_type: "check_in" | "check_out";
    scheduled_at: string;
  }[];
}

const ACTIVE_STATUSES = [
  "confermata",
  "check_in",
  "in_corso",
  "check_out",
  "chiusa",
  "cancellata",
  "rimborsata",
  "scaduto",
] as const;

export function useBookings(statusFilter?: string) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["bookings", profile?.tenant_id, statusFilter],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase
        .from("bookings")
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          booking_cats(id, cat_id, cat:cats(id, name)),
          appointments(id, appointment_type, scheduled_at)
        `)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "preventivo")
        .order("check_in_date", { ascending: true });

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Booking[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Valid transitions map
const TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  confermata: [
    { next: "appuntamento_fissato", label: "Fissa Appuntamenti" },
    { next: "cancellata", label: "Cancella" },
  ],
  appuntamento_in_fissato: [
    { next: "check_in", label: "Avvia Check-in" },
    { next: "cancellata", label: "Cancella" },
  ],
  appuntamento_out_fissato: [
    { next: "cancellata", label: "Cancella" },
  ],
  appuntamento_in_out_fissato: [
    { next: "check_in", label: "Avvia Check-in" },
    { next: "cancellata", label: "Cancella" },
  ],
  check_in: [
    { next: "in_corso", label: "Conferma Ingresso" },
    { next: "cancellata", label: "Cancella" },
  ],
  in_corso: [
    { next: "check_out", label: "Avvia Check-out" },
  ],
  check_out: [
    { next: "chiusa", label: "Chiudi Soggiorno" },
  ],
  cancellata: [
    { next: "rimborsata", label: "Rimborsa" },
  ],
};

export function getTransitions(status: string) {
  return TRANSITIONS[status] ?? [];
}

export function useTransitionBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: newStatus as any })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
    },
  });
}
