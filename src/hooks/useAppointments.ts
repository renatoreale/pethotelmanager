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
      // Use timezone-aware range to cover the full local day
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
      // Count per time slot — extract HH:MM from the stored string directly
      // scheduled_at is stored as "YYYY-MM-DDTHH:MM:00" without timezone
      const counts: Record<string, number> = {};
      for (const appt of data ?? []) {
        // Extract time directly from the ISO string to avoid timezone shifts
        const isoStr = appt.scheduled_at;
        const tIndex = isoStr.indexOf("T");
        const time = tIndex >= 0 ? isoStr.slice(tIndex + 1, tIndex + 6) : new Date(isoStr).toTimeString().slice(0, 5);
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

export interface AppointmentWithDetails {
  id: string;
  booking_id: string;
  appointment_type: "check_in" | "check_out";
  scheduled_at: string;
  duration_minutes: number;
  confirmed: boolean;
  notes: string | null;
  tenant_id: string;
  booking?: {
    id: string;
    booking_number: string;
    status: string;
    check_in_date: string;
    check_out_date: string;
    total_amount: number | null;
    client?: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
    };
    booking_cats?: {
      id: string;
      cat?: { id: string; name: string };
    }[];
  };
}

// Fetch all appointments for a given date with booking + client + cats
export function useAppointmentsByDate(date: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["appointments-by-date", profile?.tenant_id, date],
    queryFn: async () => {
      if (!profile?.tenant_id || !date) return [];
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          booking:bookings(
            id, booking_number, status, check_in_date, check_out_date, total_amount,
            client:clients(id, first_name, last_name, phone, email),
            booking_cats(id, cat:cats(id, name))
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("scheduled_at", dayStart)
        .lte("scheduled_at", dayEnd)
        .order("scheduled_at");
      if (error) throw error;
      return data as unknown as AppointmentWithDetails[];
    },
    enabled: !!profile?.tenant_id && !!date,
  });
}

// Fetch all appointments (no date filter) — used when searching across all dates
export function useAllAppointments(enabled: boolean) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["appointments-all", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          booking:bookings(
            id, booking_number, status, check_in_date, check_out_date, total_amount,
            client:clients(id, first_name, last_name, phone, email),
            booking_cats(id, cat:cats(id, name))
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("scheduled_at");
      if (error) throw error;
      return data as unknown as AppointmentWithDetails[];
    },
    enabled: enabled && !!profile?.tenant_id,
    staleTime: 30_000,
  });
}

// Fetch all appointments for a date range with booking + client + cats
export function useAppointmentsByDateRange(startDate: string | undefined, endDate: string | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["appointments-by-range", profile?.tenant_id, startDate, endDate],
    queryFn: async () => {
      if (!profile?.tenant_id || !startDate || !endDate) return [];
      const rangeStart = `${startDate}T00:00:00`;
      const rangeEnd = `${endDate}T23:59:59`;
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          booking:bookings(
            id, booking_number, status,
            client:clients(id, first_name, last_name, phone, email),
            booking_cats(id, cat:cats(id, name))
          )
        `)
        .eq("tenant_id", profile.tenant_id)
        .gte("scheduled_at", rangeStart)
        .lte("scheduled_at", rangeEnd)
        .order("scheduled_at");
      if (error) throw error;
      return data as unknown as AppointmentWithDetails[];
    },
    enabled: !!profile?.tenant_id && !!startDate && !!endDate,
  });
}

export function useConfirmAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, confirmed }: { id: string; confirmed: boolean }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({ confirmed })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookingId }: { id: string; bookingId: string }) => {
      // Delete the appointment
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;

      // Check if any appointments remain for this booking
      const { data: remaining } = await supabase
        .from("appointments")
        .select("id, appointment_type")
        .eq("booking_id", bookingId);

      // Determine new status based on remaining appointments
      const remainingTypes = (remaining ?? []).map((a: any) => a.appointment_type);
      const hasIn = remainingTypes.includes("check_in");
      const hasOut = remainingTypes.includes("check_out");

      let newStatus: string;
      if (!hasIn && !hasOut) {
        newStatus = "confermata";
      } else if (hasIn && hasOut) {
        newStatus = "appuntamento_in_out_fissato";
      } else if (hasIn) {
        newStatus = "appuntamento_in_fissato";
      } else {
        newStatus = "appuntamento_out_fissato";
      }

      // Update booking status
      await supabase
        .from("bookings")
        .update({ status: newStatus as any })
        .eq("id", bookingId)
        .in("status", ["appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato"] as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["preventivi"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      scheduled_at?: string;
      duration_minutes?: number;
      notes?: string;
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments-by-date"] });
      qc.invalidateQueries({ queryKey: ["appointment-counts"] });
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
    },
  });
}
