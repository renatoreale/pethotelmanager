import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Cat {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  breed: string | null;
  color: string | null;
  birth_date: string | null;
  gender: string | null;
  microchip: string | null;
  weight_kg: number | null;
  is_neutered: boolean;
  medical_notes: string | null;
  dietary_notes: string | null;
  behavioral_notes: string | null;
  needs_double_cage: boolean;
  sibling_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CatInsert = Omit<Cat, "id" | "created_at" | "updated_at">;
export type CatUpdate = Partial<CatInsert>;

export function useCats(clientId?: string, search?: string) {
  return useQuery({
    queryKey: ["cats", clientId, search],
    queryFn: async () => {
      let query = supabase.from("cats").select("*, clients(first_name, last_name)").order("name");

      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      if (search && search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,breed.ilike.%${search}%,microchip.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCat(id: string | undefined) {
  return useQuery({
    queryKey: ["cats", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("cats")
        .select("*, clients(first_name, last_name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cat: CatInsert) => {
      const { data, error } = await supabase
        .from("cats")
        .insert(cat)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cats"] }),
  });
}

export function useUpdateCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: CatUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("cats")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cats"] }),
  });
}

export function useDeleteCat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cats"] }),
  });
}
