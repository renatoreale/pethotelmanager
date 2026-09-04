import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarIcon, ClipboardList, Plus, Trash2, PawPrint } from "lucide-react";
import { format, isToday as isTodayFn } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  useTasksForDate, useCreateTask, useUpdateTask, useDeleteTask, useDeleteTasks, useCompleteTask,
} from "@/hooks/usePlanningTasks";
import { useCats } from "@/hooks/useCats";
import { useUsers } from "@/hooks/useUsers";
import { usePetLabels } from "@/hooks/usePetLabels";
import { cn } from "@/lib/utils";

const UNASSIGNED = "__unassigned__";
const NO_PET = "__none__";

const emptyForm = { title: "", description: "", cat_id: "", assigned_to: "" };

export default function Attivita() {
  const pet = usePetLabels();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isTodayFn(selectedDate);

  const { data: tasks, isLoading } = useTasksForDate(selectedDateStr);
  const { data: cats } = useCats();
  const { users: staffUsers } = useUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const deleteTasks = useDeleteTasks();
  const completeTask = useCompleteTask();

  const sortedTasks = useMemo(() => {
    return [...(tasks ?? [])].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [tasks]);

  // La selezione non sopravvive al cambio di data: eviterebbe di eliminare
  // per sbaglio task di un altro giorno rimaste "selezionate" per errore.
  useEffect(() => setSelectedIds(new Set()), [selectedDateStr]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Inserisci un titolo per la task");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        task_date: selectedDateStr,
        cat_id: form.cat_id || null,
        assigned_to: form.assigned_to || null,
      });
      toast.success("Task creata");
      setCreateOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast.error(err.message || "Errore nella creazione della task");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Task eliminata");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await deleteTasks.mutateAsync(ids);
      setSelectedIds(new Set());
      toast.success(`${ids.length} task eliminate`);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  const allSelected = sortedTasks.length > 0 && selectedIds.size === sortedTasks.length;
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(sortedTasks.map((t) => t.id)) : new Set());
  };
  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attività</h1>
          <p className="text-muted-foreground text-sm mt-1">Task operative dello staff, per giorno.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isSelectedToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Oggi</Button>
          )}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd MMM yyyy", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuova task
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isSelectedToday ? "Task di oggi" : `Task — ${format(selectedDate, "dd MMM yyyy", { locale: it })}`}
            {tasks && tasks.length > 0 && ` (${tasks.length})`}
          </CardTitle>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleDeleteSelected} disabled={deleteTasks.isPending}>
              <Trash2 className="h-4 w-4" /> Elimina selezionate ({selectedIds.size})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
          ) : sortedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna task per questa data.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                <Checkbox checked={allSelected} onCheckedChange={(c) => toggleSelectAll(c === true)} />
                Seleziona tutte
              </div>
              {sortedTasks.map((tk) => (
                <div key={tk.id} className="flex items-start gap-3 py-2.5 border-b last:border-0 flex-wrap sm:flex-nowrap">
                  <Checkbox
                    title="Seleziona per azioni di gruppo"
                    checked={selectedIds.has(tk.id)}
                    onCheckedChange={(checked) => toggleSelected(tk.id, checked === true)}
                    className="mt-0.5"
                  />
                  <div className="w-px self-stretch bg-border" />
                  <Checkbox
                    title="Segna come completata"
                    checked={tk.completed}
                    onCheckedChange={(checked) => completeTask.mutate({ id: tk.id, completed: checked === true })}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={cn("text-sm font-medium", tk.completed && "line-through text-muted-foreground")}>{tk.title}</p>
                      {tk.cat?.name && (
                        <Badge variant="outline" className="text-xs gap-1 shrink-0">
                          <PawPrint className="h-3 w-3" /> {tk.cat.name}
                        </Badge>
                      )}
                      {tk.booking?.booking_number && (
                        <Badge variant="secondary" className="text-xs shrink-0">{tk.booking.booking_number}</Badge>
                      )}
                    </div>
                    {tk.description && <p className="text-xs text-muted-foreground mt-0.5">{tk.description}</p>}
                    {tk.completed && tk.completed_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Completata alle {format(new Date(tk.completed_at), "HH:mm")}
                      </p>
                    )}
                  </div>
                  <Select
                    value={tk.assigned_to ?? UNASSIGNED}
                    onValueChange={(v) => updateTask.mutate({ id: tk.id, assigned_to: v === UNASSIGNED ? null : v })}
                  >
                    <SelectTrigger className="w-[160px] shrink-0 text-xs h-8">
                      <SelectValue placeholder="Non assegnato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Non assegnato</SelectItem>
                      {(staffUsers ?? []).map((u: any) => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => handleDelete(tk.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setForm(emptyForm); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              Nuova task — {format(selectedDate, "dd MMM yyyy", { locale: it })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titolo *</Label>
              <Input
                placeholder="Es. Pulizia box 3"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                rows={2}
                placeholder="Dettagli opzionali..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{pet.singularCap} (opzionale)</Label>
                <Select value={form.cat_id || NO_PET} onValueChange={(v) => setForm({ ...form, cat_id: v === NO_PET ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PET}>Nessuno</SelectItem>
                    {(cats ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assegna a (opzionale)</Label>
                <Select value={form.assigned_to || UNASSIGNED} onValueChange={(v) => setForm({ ...form, assigned_to: v === UNASSIGNED ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non assegnato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Non assegnato</SelectItem>
                    {(staffUsers ?? []).map((u: any) => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
            <Button type="button" onClick={handleCreate} disabled={createTask.isPending}>
              {createTask.isPending ? "Creazione..." : "Crea task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
