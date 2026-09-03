import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface PlanningTask {
  id: string;
  tenant_id: string;
  task_date: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTasksForDate(dateStr: string | undefined) {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["planning-tasks", profile?.tenant_id, dateStr],
    queryFn: async () => {
      if (!profile?.tenant_id || !dateStr) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("task_date", dateStr)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PlanningTask[];
    },
    enabled: !!profile?.tenant_id && !!dateStr,
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("planning_tasks")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? (user?.id ?? null) : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
    },
  });
}
