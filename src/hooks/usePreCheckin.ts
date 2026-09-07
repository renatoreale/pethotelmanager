import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PreCheckinSubmission {
  id: string;
  tenant_id: string;
  booking_id: string;
  client_id: string;
  feeding_notes: string | null;
  medication_notes: string | null;
  privacy_accepted_version: string | null;
  regolamento_accepted_version: string | null;
  consents_accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePreCheckinSubmission(bookingId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["pre-checkin-submission", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("pre_checkin_submissions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data as PreCheckinSubmission | null;
    },
    enabled: !!bookingId,
  });
}

// Lato staff: badge "pre-check-in completato" su più prenotazioni insieme
// (dashboard, checklist di check-in), stesso pattern di useDocumentsForBookings.
export function usePreCheckinSubmissionsForBookings(bookingIds: string[]) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["pre-checkin-submissions", bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pre_checkin_submissions")
        .select("*")
        .in("booking_id", bookingIds);
      if (error) throw error;
      return data as PreCheckinSubmission[];
    },
    enabled: bookingIds.length > 0,
  });
}

export function useUpsertPreCheckinSubmission() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      tenantId: string;
      clientId: string;
      feedingNotes?: string | null;
      medicationNotes?: string | null;
      privacyAcceptedVersion?: string | null;
      regolamentoAcceptedVersion?: string | null;
      consentsAcceptedAt?: string | null;
      completedAt?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("pre_checkin_submissions")
        .upsert(
          {
            booking_id: payload.bookingId,
            tenant_id: payload.tenantId,
            client_id: payload.clientId,
            feeding_notes: payload.feedingNotes ?? null,
            medication_notes: payload.medicationNotes ?? null,
            privacy_accepted_version: payload.privacyAcceptedVersion ?? null,
            regolamento_accepted_version: payload.regolamentoAcceptedVersion ?? null,
            consents_accepted_at: payload.consentsAcceptedAt ?? null,
            completed_at: payload.completedAt ?? null,
          },
          { onConflict: "booking_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as PreCheckinSubmission;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pre-checkin-submission", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["pre-checkin-submissions"] });
    },
  });
}
