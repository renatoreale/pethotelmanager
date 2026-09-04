import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export interface BookingDocument {
  id: string;
  booking_id: string;
  document_type: string;
  file_name: string;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  created_by: string | null;
}

// Documenti collegati a un pet tramite i suoi soggiorni (la tabella documents
// non ha ancora una relazione diretta con i pet, si veda il Blocco 10).
export function useDocumentsForBookings(bookingIds: string[]) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["documents-for-bookings", bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BookingDocument[];
    },
    enabled: bookingIds.length > 0,
  });
}
