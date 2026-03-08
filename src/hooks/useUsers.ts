import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  role: AppRole | null;
  role_id: string | null;
  tenant_id: string | null;
}

export function useUsers() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", profile?.tenant_id],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*");
      
      if (profile?.tenant_id) {
        query = query.eq("tenant_id", profile.tenant_id);
      }
      
      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.user_id);
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);
        
      if (rolesError) throw rolesError;

      return profiles.map(p => {
        const userRole = roles?.find(r => r.user_id === p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          tenant_id: p.tenant_id,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
        } as UserWithRole;
      });
    },
    enabled: !!profile,
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role, existingRoleId }: { userId: string, role: AppRole, existingRoleId: string | null }) => {
      if (existingRoleId) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", existingRoleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role, tenant_id: profile?.tenant_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Ruolo aggiornato con successo");
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento del ruolo: " + error.message);
    }
  });

  return {
    users,
    isLoading,
    assignRole,
  };
}
