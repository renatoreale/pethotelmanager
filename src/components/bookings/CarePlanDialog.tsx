import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, UtensilsCrossed, Pill, Activity, StickyNote, ClipboardList, Sparkles,
  PawPrint, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateCarePlan, type CarePlan, type CarePlanFeeding, type CarePlanMedication, type CarePlanActivity,
  type CareDateSelection,
} from "@/hooks/useBookings";
import { useTasksForBooking, useGenerateTasksFromCarePlan, useDeleteTask, useDeleteTasks } from "@/hooks/usePlanningTasks";
import { format, eachDayOfInterval } from "date-fns";
import { it } from "date-fns/locale";

const EMPTY_PLAN: CarePlan = { feeding: [], medications: [], activities: [], special_notes: "" };
const ALL_PETS = "__all__";

function expandDates(sel: CareDateSelection | undefined, minDate: string, maxDate: string): string[] {
  if (!sel) return [];
  if (sel.mode === "dates") {
    return Array.from(new Set(sel.dates ?? [])).sort();
  }
  const from = sel.from || minDate;
  const to = sel.to || maxDate;
  if (from > to) return [];
  return eachDayOfInterval({ start: new Date(from + "T00:00:00"), end: new Date(to + "T00:00:00") })
    .map((d) => format(d, "yyyy-MM-dd"));
}

function defaultDateSelection(booking: any): CareDateSelection {
  return { mode: "period", from: booking.check_in_date, to: booking.check_out_date };
}

function normalizeEntries<T extends { catId?: string; dateSelection?: CareDateSelection }>(
  entries: any[] | undefined, booking: any
): T[] {
  return (entries ?? []).map((e: any) => ({
    ...e,
    catId: e.catId ?? "",
    dateSelection: e.dateSelection ?? defaultDateSelection(booking),
  })) as T[];
}

interface CarePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any | null;
}

export function CarePlanDialog({ open, onOpenChange, booking }: CarePlanDialogProps) {
  const updateCarePlan = useUpdateCarePlan();
  const generateTasks = useGenerateTasksFromCarePlan();
  const deleteTask = useDeleteTask();
  const deleteTasks = useDeleteTasks();
  const { data: tasks } = useTasksForBooking(open ? booking?.id : undefined);

  const [plan, setPlan] = useState<CarePlan>(EMPTY_PLAN);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const pets: { id: string; name: string }[] = useMemo(
    () => (booking?.booking_cats ?? []).map((bc: any) => ({ id: bc.cat_id ?? bc.cat?.id, name: bc.cat?.name })).filter((p: any) => p.id && p.name),
    [booking]
  );
  const hasMultiplePets = pets.length > 1;
  const defaultCatId = pets.length === 1 ? pets[0].id : "";

  useEffect(() => {
    if (open && booking) {
      const existing = booking?.care_plan as CarePlan | null | undefined;
      setPlan({
        feeding: normalizeEntries<CarePlanFeeding>(existing?.feeding, booking),
        medications: normalizeEntries<CarePlanMedication>(existing?.medications, booking),
        activities: normalizeEntries<CarePlanActivity>(existing?.activities, booking),
        special_notes: existing?.special_notes ?? "",
      });
      setSelectedTaskIds(new Set());
    }
  }, [open, booking]);

  if (!booking) return null;

  const petNameById = (catId: string | undefined) => pets.find((p) => p.id === catId)?.name;
  const allCatNames = pets.map((p) => p.name).join(", ") || "il pet";
  const labelForCat = (catId: string | undefined) => petNameById(catId) ?? allCatNames;

  const handleSave = async () => {
    try {
      await updateCarePlan.mutateAsync({ id: booking.id, carePlan: plan });
      toast.success("Piano di cura salvato");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  const handleGenerateTasks = async () => {
    const candidates: { taskDate: string; catId: string | null; title: string; description?: string }[] = [];

    const buildTasks = (
      entries: { catId: string; dateSelection: CareDateSelection }[],
      hasContent: (e: any) => boolean,
      titlePrefix: (e: any) => string,
      description: (e: any) => string | undefined,
    ) => {
      for (const e of entries) {
        if (!hasContent(e)) continue;
        const dates = expandDates(e.dateSelection, booking.check_in_date, booking.check_out_date);
        for (const d of dates) {
          candidates.push({ taskDate: d, catId: e.catId || null, title: titlePrefix(e), description: description(e) });
        }
      }
    };

    buildTasks(
      plan.feeding, (f) => f.food.trim(),
      (f) => `Alimentazione — ${labelForCat(f.catId)}${f.time ? ` (${f.time})` : ""}`,
      (f) => [f.food, f.quantity].filter(Boolean).join(" — "),
    );
    buildTasks(
      plan.medications, (m) => m.name.trim(),
      (m) => `Farmaco — ${labelForCat(m.catId)}${m.time ? ` (${m.time})` : ""}`,
      (m) => [m.name, m.dose].filter(Boolean).join(" — "),
    );
    buildTasks(
      plan.activities, (a) => a.activity.trim(),
      (a) => `${a.activity} — ${labelForCat(a.catId)}${a.time ? ` (${a.time})` : ""}`,
      (a) => a.frequency || undefined,
    );

    if (candidates.length === 0) {
      toast.error("Aggiungi almeno una voce al piano prima di generare le task");
      return;
    }

    // "Genera task" è idempotente: non ricrea le task già generate in un giro
    // precedente (stesso giorno, stesso pet, stesso titolo/descrizione),
    // altrimenti ogni click duplicherebbe tutto il piano invece di aggiungere
    // solo le voci nuove.
    const taskKey = (t: { taskDate: string; catId: string | null; title: string; description?: string }) =>
      `${t.taskDate}|${t.catId ?? ""}|${t.title}|${t.description ?? ""}`;
    const existingKeys = new Set((tasks ?? []).map((t) => taskKey({
      taskDate: t.task_date, catId: t.cat_id, title: t.title, description: t.description ?? undefined,
    })));
    const newTasks = candidates.filter((c) => !existingKeys.has(taskKey(c)));

    if (newTasks.length === 0) {
      toast.info("Tutte le task di questo piano erano già state generate.");
      return;
    }
    try {
      await generateTasks.mutateAsync({ bookingId: booking.id, tasks: newTasks });
      toast.success(`${newTasks.length} nuove task generate`);
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione delle task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      setSelectedTaskIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Task eliminata");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  const handleDeleteSelectedTasks = async () => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    try {
      await deleteTasks.mutateAsync(ids);
      setSelectedTaskIds(new Set());
      toast.success(`${ids.length} task eliminate`);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  const allTasksSelected = (tasks?.length ?? 0) > 0 && selectedTaskIds.size === tasks?.length;
  const toggleSelectAllTasks = (checked: boolean) => {
    setSelectedTaskIds(checked ? new Set((tasks ?? []).map((t) => t.id)) : new Set());
  };
  const toggleTaskSelected = (id: string, checked: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Piano di cura — {booking.booking_number}</DialogTitle>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span>
              {format(new Date(booking.check_in_date + "T00:00:00"), "dd MMM yyyy", { locale: it })}
              {" → "}
              {format(new Date(booking.check_out_date + "T00:00:00"), "dd MMM yyyy", { locale: it })}
            </span>
            {pets.map((p) => (
              <Badge key={p.id} variant="outline" className="gap-1 text-xs">
                <PawPrint className="h-3 w-3" /> {p.name}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <CarePlanSection<CarePlanFeeding>
            icon={UtensilsCrossed}
            title="Alimentazione"
            rows={plan.feeding}
            onChange={(rows) => setPlan({ ...plan, feeding: rows })}
            newRow={{ catId: defaultCatId, food: "", quantity: "", time: "", dateSelection: defaultDateSelection(booking) }}
            fields={[
              { key: "food", placeholder: "Cosa (es. crocchette)" },
              { key: "quantity", placeholder: "Quanto (es. 50g)" },
              { key: "time", placeholder: "Orario (es. 08:00)" },
            ]}
            pets={hasMultiplePets ? pets : []}
            minDate={booking.check_in_date}
            maxDate={booking.check_out_date}
          />

          <CarePlanSection<CarePlanMedication>
            icon={Pill}
            title="Farmaci"
            rows={plan.medications}
            onChange={(rows) => setPlan({ ...plan, medications: rows })}
            newRow={{ catId: defaultCatId, name: "", dose: "", time: "", dateSelection: defaultDateSelection(booking) }}
            fields={[
              { key: "name", placeholder: "Cosa (es. antibiotico)" },
              { key: "dose", placeholder: "Dose (es. 1 compressa)" },
              { key: "time", placeholder: "Orario (es. 08:00, 20:00)" },
            ]}
            pets={hasMultiplePets ? pets : []}
            minDate={booking.check_in_date}
            maxDate={booking.check_out_date}
          />

          <CarePlanSection<CarePlanActivity>
            icon={Activity}
            title="Attività"
            rows={plan.activities}
            onChange={(rows) => setPlan({ ...plan, activities: rows })}
            newRow={{ catId: defaultCatId, activity: "", frequency: "", time: "", dateSelection: defaultDateSelection(booking) }}
            fields={[
              { key: "activity", placeholder: "Attività (es. passeggiata)" },
              { key: "frequency", placeholder: "Frequenza (es. 2 volte al giorno)" },
              { key: "time", placeholder: "Orario" },
            ]}
            pets={hasMultiplePets ? pets : []}
            minDate={booking.check_in_date}
            maxDate={booking.check_out_date}
          />

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <StickyNote className="h-4 w-4" /> Note speciali
            </Label>
            <Textarea
              rows={3}
              placeholder="Tutto ciò che lo staff deve sapere per questo soggiorno..."
              value={plan.special_notes}
              onChange={(e) => setPlan({ ...plan, special_notes: e.target.value })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardList className="h-4 w-4" /> Task generate ({tasks?.length ?? 0})
              </Label>
              <div className="flex items-center gap-2">
                {selectedTaskIds.size > 0 && (
                  <Button
                    type="button" size="sm" variant="destructive" className="gap-1.5"
                    onClick={handleDeleteSelectedTasks} disabled={deleteTasks.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Elimina selezionate ({selectedTaskIds.size})
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleGenerateTasks} disabled={generateTasks.isPending}>
                  <Sparkles className="h-3.5 w-3.5" /> Genera task
                </Button>
              </div>
            </div>
            {!tasks?.length ? (
              <p className="text-sm text-muted-foreground">Nessuna task generata da questo piano.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                  <Checkbox checked={allTasksSelected} onCheckedChange={(c) => toggleSelectAllTasks(c === true)} />
                  Seleziona tutte
                </div>
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-sm border-b py-1.5 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox checked={selectedTaskIds.has(t.id)} onCheckedChange={(c) => toggleTaskSelected(t.id, c === true)} />
                      <div className="min-w-0">
                        <span className={t.completed ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                        {t.description && <span className="text-muted-foreground"> — {t.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={t.completed ? "secondary" : "outline"} className="text-xs">
                        {t.completed ? "Completata" : format(new Date(t.task_date + "T00:00:00"), "dd MMM", { locale: it })}
                      </Badge>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteTask(t.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
          <Button type="button" onClick={handleSave} disabled={updateCarePlan.isPending}>
            {updateCarePlan.isPending ? "Salvataggio..." : "Salva piano di cura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CareDatesEditor({ value, onChange, minDate, maxDate }: {
  value: CareDateSelection;
  onChange: (v: CareDateSelection) => void;
  minDate: string;
  maxDate: string;
}) {
  const mode = value?.mode ?? "period";
  const dates = value?.dates ?? [];
  const [draftDate, setDraftDate] = useState("");

  const addDate = () => {
    if (!draftDate) return;
    if (!dates.includes(draftDate)) {
      onChange({ ...value, dates: [...dates, draftDate].sort() });
    }
    setDraftDate("");
  };

  return (
    <div className="space-y-2 pt-1 border-t">
      <div className="flex items-center gap-1.5">
        <Button
          type="button" size="sm" variant={mode === "period" ? "secondary" : "outline"} className="h-6 text-xs px-2"
          onClick={() => onChange({ ...value, mode: "period", from: value?.from || minDate, to: value?.to || maxDate })}
        >
          Periodo
        </Button>
        <Button
          type="button" size="sm" variant={mode === "dates" ? "secondary" : "outline"} className="h-6 text-xs px-2"
          onClick={() => onChange({ ...value, mode: "dates", dates: value?.dates ?? [] })}
        >
          Date singole
        </Button>
      </div>

      {mode === "period" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date" className="text-sm h-8" min={minDate} max={maxDate}
            value={value?.from || minDate}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            type="date" className="text-sm h-8" min={value?.from || minDate} max={maxDate}
            value={value?.to || maxDate}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="date" className="text-sm h-8" min={minDate} max={maxDate}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={addDate} disabled={!draftDate}>
              <Plus className="h-3.5 w-3.5" /> Aggiungi data
            </Button>
          </div>
          {dates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dates.map((d) => (
                <Badge key={d} variant="secondary" className="text-xs gap-1 pr-1">
                  {format(new Date(d + "T00:00:00"), "dd MMM", { locale: it })}
                  <button
                    type="button"
                    className="rounded-full hover:bg-muted-foreground/20"
                    onClick={() => onChange({ ...value, dates: dates.filter((x) => x !== d) })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CarePlanSection<T extends { catId: string; dateSelection: CareDateSelection }>({
  icon: Icon, title, rows, onChange, newRow, fields, pets, minDate, maxDate,
}: {
  icon: any;
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  newRow: T;
  fields: { key: keyof T; placeholder: string }[];
  pets: { id: string; name: string }[];
  minDate: string;
  maxDate: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="h-4 w-4" /> {title}
        </Label>
        <Button type="button" size="sm" variant="ghost" className="gap-1.5 h-7" onClick={() => onChange([...rows, { ...newRow }])}>
          <Plus className="h-3.5 w-3.5" /> Aggiungi
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessuna voce.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                {pets.length > 0 && (
                  <Select
                    value={row.catId || ALL_PETS}
                    onValueChange={(v) => {
                      const next = [...rows];
                      next[i] = { ...next[i], catId: v === ALL_PETS ? "" : v };
                      onChange(next);
                    }}
                  >
                    <SelectTrigger className="w-[110px] shrink-0 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_PETS}>Pets</SelectItem>
                      {pets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {fields.map((f) => (
                  <Input
                    key={String(f.key)}
                    placeholder={f.placeholder}
                    value={(row[f.key] as string) ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], [f.key]: e.target.value };
                      onChange(next);
                    }}
                    className="text-sm"
                  />
                ))}
                <Button
                  type="button" size="icon" variant="ghost" className="shrink-0 h-9 w-9"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <CareDatesEditor
                value={row.dateSelection}
                onChange={(v) => {
                  const next = [...rows];
                  next[i] = { ...next[i], dateSelection: v };
                  onChange(next);
                }}
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
