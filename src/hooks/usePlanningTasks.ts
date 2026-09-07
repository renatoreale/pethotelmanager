import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { TaskCategory, TaskPriority } from "@/lib/taskCategories";

export interface PlanningTask {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  cat_id: string | null;
  task_date: string;
  scheduled_time: string | null;
  category: TaskCategory;
  priority: TaskPriority;
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

// Nome generico: usata sia per generare le task dal piano di cura (Blocco 4)
// sia per le checklist di check-in/check-out (Blocco 10) — inserisce più
// task per una prenotazione in un'unica chiamata.
export function useGenerateTasksForBooking() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      tasks: {
        taskDate: string; catId?: string | null; title: string; description?: string;
        category?: TaskCategory; scheduledTime?: string | null; completed?: boolean;
      }[];
    }) => {
      if (!profile?.tenant_id) throw new Error("Tenant non configurato");
      if (input.tasks.length === 0) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("planning_tasks")
        .insert(input.tasks.map((t) => ({
          tenant_id: profile.tenant_id!,
          booking_id: input.bookingId,
          cat_id: t.catId || null,
          task_date: t.taskDate,
          scheduled_time: t.scheduledTime || null,
          title: t.title,
          description: t.description ?? null,
          category: t.category ?? "altro",
          completed: t.completed ?? false,
          completed_at: t.completed ? now : null,
          completed_by: t.completed ? (user?.id ?? null) : null,
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
      scheduled_time?: string | null;
      category?: TaskCategory;
      priority?: TaskPriority;
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
          scheduled_time: input.scheduled_time || null,
          category: input.category ?? "altro",
          priority: input.priority ?? "media",
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
      scheduled_time?: string | null;
      category?: TaskCategory;
      priority?: TaskPriority;
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

// Somministrazione farmaco / pasto: a differenza di useCompleteTask, questa
// mutation è a senso unico (non permette di tornare indietro). Una volta
// registrata, chi/quando restano nello storico — niente modifiche silenziose,
// come richiesto dal Blocco 6 (farmaci) e dal Blocco 7 (pasti).
export function useMarkTaskAdministered() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Utente non autenticato");
      const { error } = await supabase
        .from("planning_tasks")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq("id", id)
        .eq("completed", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning-tasks"] });
      qc.invalidateQueries({ queryKey: ["planning-tasks-booking"] });
    },
  });
}

// Filtra via i candidati già presenti tra le task esistenti di una
// prenotazione (stesso giorno, stesso pet, stesso titolo/descrizione),
// così generare una checklist più volte non duplica le voci già create.
export function dedupeNewTasks<T extends { taskDate: string; catId?: string | null; title: string; description?: string }>(
  existing: PlanningTask[], candidates: T[]
): T[] {
  const key = (t: { taskDate: string; catId?: string | null; title: string; description?: string }) =>
    `${t.taskDate}|${t.catId ?? ""}|${t.title}|${t.description ?? ""}`;
  const existingKeys = new Set(existing.map((t) => key({
    taskDate: t.task_date, catId: t.cat_id, title: t.title, description: t.description ?? undefined,
  })));
  return candidates.filter((c) => !existingKeys.has(key(c)));
}
