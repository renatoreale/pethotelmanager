import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface DiarioEntry {
  id: string;
  tenant_id: string;
  cat_id: string;
  booking_id: string | null;
  note: string;
  photo_path: string | null;
  created_by: string | null;
  created_at: string;
  booking?: { id: string; booking_number: string } | null;
}

const DIARIO_SELECT = "*, booking:bookings(id, booking_number)";

export function useDiarioForCat(catId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["diario", catId],
    queryFn: async () => {
      if (!catId) return [];
      const { data, error } = await supabase
        .from("diario_entries")
        .select(DIARIO_SELECT)
        .eq("cat_id", catId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DiarioEntry[];
    },
    enabled: !!catId,
  });
}

export function useCreateDiarioEntry() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: {
      catId: string; bookingId?: string | null; note: string; photoFile?: File | null;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");

      // La foto va nel bucket pubblico "diario-photos": un file per voce di
      // diario (nome univoco), a differenza di "cat-photos" dove il path è
      // fisso per pet e si sovrascrive ad ogni aggiornamento.
      let photoPath: string | null = null;
      if (input.photoFile) {
        const ext = input.photoFile.name.split(".").pop() || "jpg";
        photoPath = `${profile.tenant_id}/${input.catId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("diario-photos")
          .upload(photoPath, input.photoFile);
        if (uploadError) throw uploadError;
      }

      const { data, error } = await supabase
        .from("diario_entries")
        .insert({
          tenant_id: profile.tenant_id,
          cat_id: input.catId,
          booking_id: input.bookingId || null,
          note: input.note,
          photo_path: photoPath,
          created_by: user?.id ?? null,
        })
        .select(DIARIO_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["diario", vars.catId] });
    },
  });
}

export function useDeleteDiarioEntry() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({ id, catId, photoPath }: { id: string; catId: string; photoPath?: string | null }) => {
      const { error } = await supabase.from("diario_entries").delete().eq("id", id);
      if (error) throw error;
      if (photoPath) {
        // La foto orfana non deve bloccare la cancellazione della voce.
        await supabase.storage.from("diario-photos").remove([photoPath]).catch(() => {});
      }
      return catId;
    },
    onSuccess: (catId) => {
      qc.invalidateQueries({ queryKey: ["diario", catId] });
    },
  });
}
