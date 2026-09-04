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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UtensilsCrossed, Pill, Activity, StickyNote, ClipboardList, Sparkles, PawPrint } from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateCarePlan, type CarePlan, type CarePlanFeeding, type CarePlanMedication, type CarePlanActivity,
} from "@/hooks/useBookings";
import { useTasksForBooking, useGenerateTasksFromCarePlan } from "@/hooks/usePlanningTasks";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const EMPTY_PLAN: CarePlan = { feeding: [], medications: [], activities: [], special_notes: "" };
const ALL_PETS = "__all__";

interface CarePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any | null;
}

export function CarePlanDialog({ open, onOpenChange, booking }: CarePlanDialogProps) {
  const updateCarePlan = useUpdateCarePlan();
  const generateTasks = useGenerateTasksFromCarePlan();
  const { data: tasks } = useTasksForBooking(open ? booking?.id : undefined);

  const [plan, setPlan] = useState<CarePlan>(EMPTY_PLAN);

  const pets: { id: string; name: string }[] = useMemo(
    () => (booking?.booking_cats ?? []).map((bc: any) => ({ id: bc.cat_id ?? bc.cat?.id, name: bc.cat?.name })).filter((p: any) => p.id && p.name),
    [booking]
  );
  const hasMultiplePets = pets.length > 1;
  const defaultCatId = pets.length === 1 ? pets[0].id : "";

  useEffect(() => {
    if (open) {
      const existing = booking?.care_plan as CarePlan | null | undefined;
      setPlan({
        feeding: existing?.feeding ?? [],
        medications: existing?.medications ?? [],
        activities: existing?.activities ?? [],
        special_notes: existing?.special_notes ?? "",
      });
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
    const newTasks: { title: string; description?: string }[] = [];
    for (const f of plan.feeding) {
      if (!f.food.trim()) continue;
      newTasks.push({
        title: `Alimentazione — ${labelForCat(f.catId)}${f.time ? ` (${f.time})` : ""}`,
        description: [f.food, f.quantity].filter(Boolean).join(" — "),
      });
    }
    for (const m of plan.medications) {
      if (!m.name.trim()) continue;
      newTasks.push({
        title: `Farmaco — ${labelForCat(m.catId)}${m.time ? ` (${m.time})` : ""}`,
        description: [m.name, m.dose].filter(Boolean).join(" — "),
      });
    }
    for (const a of plan.activities) {
      if (!a.activity.trim()) continue;
      newTasks.push({
        title: `${a.activity} — ${labelForCat(a.catId)}${a.time ? ` (${a.time})` : ""}`,
        description: a.frequency || undefined,
      });
    }
    if (newTasks.length === 0) {
      toast.error("Aggiungi almeno una voce al piano prima di generare le task");
      return;
    }
    // Le task generate qui sono per il lavoro di oggi, non per la data di
    // check-in originale del preventivo: altrimenti restano "invisibili"
    // nella dashboard "Oggi in pensione" (che mostra solo le task del giorno
    // selezionato).
    const taskDate = format(new Date(), "yyyy-MM-dd");
    try {
      await generateTasks.mutateAsync({ bookingId: booking.id, taskDate, tasks: newTasks });
      toast.success(`${newTasks.length} task generate per il ${format(new Date(taskDate + "T00:00:00"), "dd MMM yyyy", { locale: it })}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione delle task");
    }
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
          <ListSection
            icon={UtensilsCrossed}
            title="Alimentazione"
            rows={plan.feeding}
            onChange={(rows) => setPlan({ ...plan, feeding: rows })}
            newRow={{ catId: defaultCatId, food: "", quantity: "", time: "" } as CarePlanFeeding}
            fields={[
              { key: "food", placeholder: "Cosa (es. crocchette)" },
              { key: "quantity", placeholder: "Quanto (es. 50g)" },
              { key: "time", placeholder: "Quando (es. 08:00)" },
            ]}
            pets={hasMultiplePets ? pets : []}
          />

          <ListSection
            icon={Pill}
            title="Farmaci"
            rows={plan.medications}
            onChange={(rows) => setPlan({ ...plan, medications: rows })}
            newRow={{ catId: defaultCatId, name: "", dose: "", time: "", duration: "" } as CarePlanMedication}
            fields={[
              { key: "name", placeholder: "Cosa (es. antibiotico)" },
              { key: "dose", placeholder: "Dose (es. 1 compressa)" },
              { key: "time", placeholder: "Quando (es. 08:00, 20:00)" },
              { key: "duration", placeholder: "Durata (es. 7 giorni)" },
            ]}
            pets={hasMultiplePets ? pets : []}
          />

          <ListSection
            icon={Activity}
            title="Attività"
            rows={plan.activities}
            onChange={(rows) => setPlan({ ...plan, activities: rows })}
            newRow={{ catId: defaultCatId, activity: "", frequency: "", time: "" } as CarePlanActivity}
            fields={[
              { key: "activity", placeholder: "Attività (es. passeggiata)" },
              { key: "frequency", placeholder: "Frequenza (es. 2 volte al giorno)" },
              { key: "time", placeholder: "Orario" },
            ]}
            pets={hasMultiplePets ? pets : []}
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
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <ClipboardList className="h-4 w-4" /> Task generate ({tasks?.length ?? 0})
              </Label>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleGenerateTasks} disabled={generateTasks.isPending}>
                <Sparkles className="h-3.5 w-3.5" /> Genera task
              </Button>
            </div>
            {!tasks?.length ? (
              <p className="text-sm text-muted-foreground">Nessuna task generata da questo piano.</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm border-b py-1.5 last:border-0">
                    <div>
                      <span className={t.completed ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                      {t.description && <span className="text-muted-foreground"> — {t.description}</span>}
                    </div>
                    <Badge variant={t.completed ? "secondary" : "outline"} className="text-xs shrink-0 ml-2">
                      {t.completed ? "Completata" : format(new Date(t.task_date + "T00:00:00"), "dd MMM", { locale: it })}
                    </Badge>
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

function ListSection<T extends { catId: string }>({
  icon: Icon, title, rows, onChange, newRow, fields, pets,
}: {
  icon: any;
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  newRow: T;
  fields: { key: keyof T; placeholder: string }[];
  pets: { id: string; name: string }[];
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
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
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
                    <SelectItem value={ALL_PETS}>Tutti</SelectItem>
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
              <Button type="button" size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
