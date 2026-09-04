import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface PlanningTask {
  id: string;
  tenant_id: string;
  booking_id: string | null;
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

export function useTasksForBooking(bookingId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["planning-tasks-booking", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .select("*")
        .eq("booking_id", bookingId)
        .order("task_date", { ascending: true });
      if (error) throw error;
      return data as PlanningTask[];
    },
    enabled: !!bookingId,
  });
}

export function useGenerateTasksFromCarePlan() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: { bookingId: string; taskDate: string; tasks: { title: string; description?: string }[] }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      if (input.tasks.length === 0) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .insert(input.tasks.map((t) => ({
          tenant_id: profile.tenant_id!,
          booking_id: input.bookingId,
          task_date: input.taskDate,
          title: t.title,
          description: t.description ?? null,
        })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
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
