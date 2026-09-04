import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// Quando somministrare: un elenco di date singole oppure un intero periodo
// (sempre vincolato, in UI, alle date di check-in/check-out del soggiorno).
export interface CareDateSelection {
  mode: "period" | "dates";
  from?: string;
  to?: string;
  dates?: string[];
}

export interface CarePlanFeeding {
  catId: string;
  food: string;
  quantity: string;
  time: string;
}
export interface CarePlanMedication {
  catId: string;
  name: string;
  dose: string;
  time: string;
  dateSelection: CareDateSelection;
}
export interface CarePlanActivity {
  catId: string;
  activity: string;
  frequency: string;
  time: string;
}
export interface CarePlan {
  feeding: CarePlanFeeding[];
  medications: CarePlanMedication[];
  activities: CarePlanActivity[];
  special_notes: string;
}

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
  care_plan?: CarePlan | null;
  pet_type?: "gatti" | "cani" | "entrambi" | null;
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
  payments?: {
    id: string;
    payment_type: string;
    amount: number;
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
  const supabase = useSupabase();
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
          appointments(id, appointment_type, scheduled_at),
          payments(id, payment_type, amount)
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

export function useUpdateCarePlan() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({ id, carePlan }: { id: string; carePlan: CarePlan }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ care_plan: carePlan as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["pet-bookings"] });
    },
  });
}

export function usePetBookings(catId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["pet-bookings", catId],
    queryFn: async () => {
      if (!catId) return [];
      const { data, error } = await supabase
        .from("booking_cats")
        .select(`
          booking:bookings(
            *,
            client:clients(id, first_name, last_name, email, phone),
            booking_cats(id, cat_id, cat:cats(id, name)),
            appointments(id, appointment_type, scheduled_at),
            payments(id, payment_type, amount)
          )
        `)
        .eq("cat_id", catId);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.booking)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.check_in_date < b.check_in_date ? 1 : -1)) as unknown as Booking[];
    },
    enabled: !!catId,
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

const TRIAL_EVENT_FOR_STATUS: Record<string, string> = {
  confermata: "prenotazione_confermata",
  check_in: "check_in_effettuato",
  check_out: "check_out_effettuato",
};

export function useTransitionBooking() {
  const qc = useQueryClient();
  const supabase = useSupabase();
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
    onSuccess: (_data, { newStatus }) => {
      // Fase 5: traccia l'azione per la timeline trial in admin (no-op per
      // utenti non in prova, gestito lato server). Non deve mai bloccare.
      const trialEvent = TRIAL_EVENT_FOR_STATUS[newStatus];
      if (trialEvent) {
        supabase.functions.invoke("log-trial-event", { body: { event: trialEvent } }).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-range"] });
      qc.invalidateQueries({ queryKey: ["appointments-all"] });
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
      qc.invalidateQueries({ queryKey: ["payments-all"] });
      qc.invalidateQueries({ queryKey: ["bookings-with-payments"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["appointments-by-range"] });
      qc.invalidateQueries({ queryKey: ["appointments-all"] });
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
    },
  });
}
