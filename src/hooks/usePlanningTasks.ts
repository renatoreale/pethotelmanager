import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface PlanningTask {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  cat_id: string | null;
  task_date: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  cat?: { id: string; name: string } | null;
  booking?: { id: string; booking_number: string } | null;
}

const TASK_SELECT = "*, cat:cats(id, name), booking:bookings(id, booking_number)";

export function useTasksForDate(dateStr: string | undefined) {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["planning-tasks", profile?.tenant_id, dateStr],
    queryFn: async () => {
      if (!profile?.tenant_id || !dateStr) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .select(TASK_SELECT)
        .eq("tenant_id", profile.tenant_id)
        .eq("task_date", dateStr)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as PlanningTask[];
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
        .select(TASK_SELECT)
        .eq("booking_id", bookingId)
        .order("task_date", { ascending: true });
      if (error) throw error;
      return data as unknown as PlanningTask[];
    },
    enabled: !!bookingId,
  });
}

export function useGenerateTasksFromCarePlan() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: { bookingId: string; tasks: { taskDate: string; catId?: string | null; title: string; description?: string }[] }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      if (input.tasks.length === 0) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .insert(input.tasks.map((t) => ({
          tenant_id: profile.tenant_id!,
          booking_id: input.bookingId,
          cat_id: t.catId || null,
          task_date: t.taskDate,
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

export function useCreateTask() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      task_date: string;
      assigned_to?: string | null;
      cat_id?: string | null;
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      const { data, error } = await supabase
        .from("planning_tasks")
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          description: input.description || null,
          task_date: input.task_date,
          assigned_to: input.assigned_to || null,
          cat_id: input.cat_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      description?: string | null;
      task_date?: string;
      assigned_to?: string | null;
      cat_id?: string | null;
    }) => {
      const { error } = await supabase
        .from("planning_tasks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planning_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
  });
}

export function useDeleteTasks() {
  const qc = useQueryClient();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("planning_tasks").delete().in("id", ids);
      if (error) throw error;
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
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
  });
}
