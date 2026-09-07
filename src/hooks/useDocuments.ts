import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { DocumentType } from "@/lib/documentTypes";

export interface BookingDocument {
  id: string;
  booking_id: string | null;
  document_type: DocumentType;
  file_name: string;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
  created_by: string | null;
}

const BUCKET = "booking-documents";

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
      return data as unknown as BookingDocument[];
    },
    enabled: bookingIds.length > 0,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: {
      bookingId: string | null;
      catId: string;
      documentType: DocumentType;
      file: File;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const ext = input.file.name.split(".").pop() || "bin";
      const folder = input.bookingId ?? input.catId;
      const storagePath = `${profile.tenant_id}/${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, input.file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          tenant_id: profile.tenant_id,
          booking_id: input.bookingId,
          document_type: input.documentType,
          file_name: input.file.name,
          storage_path: storagePath,
          mime_type: input.file.type || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-for-bookings"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      // Il file orfano nello storage non deve bloccare la cancellazione della riga.
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-for-bookings"] });
    },
  });
}

// Bucket privato: niente URL pubbliche, si genera una URL firmata a breve
// scadenza solo quando l'utente chiede di vedere/scaricare il documento.
export async function getDocumentSignedUrl(
  supabase: ReturnType<typeof useSupabase>,
  storagePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
