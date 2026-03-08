import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface SlotAvailability {
  time: string; // "HH:MM"
  available: number; // remaining capacity
}

// Fetch slot configs for a specific appointment type and day of week
export function useSlotConfigsForDay(appointmentType: "check_in" | "check_out", dayOfWeek: number | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["slot-configs-day", profile?.tenant_id, appointmentType, dayOfWeek],
    queryFn: async () => {
      if (!profile?.tenant_id || dayOfWeek === undefined) return [];
      const { data, error } = await supabase
        .from("slot_configs")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;
      // Filter by appointment_type in JS since column is text
      return (data ?? []).filter((s: any) => s.appointment_type === appointmentType);
    },
    enabled: !!profile?.tenant_id && dayOfWeek !== undefined,
  });
}

// Generate time slots from a slot config
export function generateTimeSlots(config: any): string[] {
  const slots: string[] = [];
  const [startH, startM] = config.start_time.slice(0, 5).split(":").map(Number);
  const [endH, endM] = config.end_time.slice(0, 5).split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const duration = config.slot_duration_minutes;

  for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

// Count existing appointments for a given date/time to check availability
export function useAppointmentCounts(date: string | undefined, appointmentType: "check_in" | "check_out") {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["appointment-counts", profile?.tenant_id, date, appointmentType],
    queryFn: async () => {
      if (!profile?.tenant_id || !date) return {};
      // Fetch all appointments of this type on this date
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_at")
        .eq("tenant_id", profile.tenant_id)
        .eq("appointment_type", appointmentType)
        .gte("scheduled_at", dayStart)
        .lte("scheduled_at", dayEnd);
      if (error) throw error;
      // Count per time slot
      const counts: Record<string, number> = {};
      for (const appt of data ?? []) {
        const time = new Date(appt.scheduled_at).toTimeString().slice(0, 5);
        counts[time] = (counts[time] || 0) + 1;
      }
      return counts;
    },
    enabled: !!profile?.tenant_id && !!date,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      booking_id: string;
      appointment_type: "check_in" | "check_out";
      scheduled_at: string; // ISO datetime
      duration_minutes?: number;
      notes?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// Fetch appointments for a booking
export function useBookingAppointments(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["booking-appointments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}
