import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Pill, PawPrint, Check, Clock } from "lucide-react";
import { format, isToday as isTodayFn } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useTasksForDate, useMarkMedicationAdministered } from "@/hooks/usePlanningTasks";
import { useUsers } from "@/hooks/useUsers";
import { usePetLabels } from "@/hooks/usePetLabels";
import { cn } from "@/lib/utils";

export default function Farmaci() {
  const pet = usePetLabels();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isTodayFn(selectedDate);

  const { data: tasks, isLoading } = useTasksForDate(selectedDateStr);
  const { users: staffUsers } = useUsers();
  const markAdministered = useMarkMedicationAdministered();

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    (staffUsers ?? []).forEach((u: any) => map.set(u.user_id, u.full_name || "Staff"));
    return map;
  }, [staffUsers]);

  // Solo le task "farmaco", raggruppate per pet e ordinate per orario — le
  // somministrazioni senza pet associato (piano di cura generico) finiscono
  // in un gruppo a parte in fondo.
  const groups = useMemo(() => {
    const meds = (tasks ?? []).filter((t) => t.category === "farmaco");
    const byPet = new Map<string, { petName: string | null; items: typeof meds }>();
    for (const m of meds) {
      const key = m.cat_id ?? "__none__";
      if (!byPet.has(key)) byPet.set(key, { petName: m.cat?.name ?? null, items: [] });
      byPet.get(key)!.items.push(m);
    }
    const sortByTime = (a: typeof meds[number], b: typeof meds[number]) => {
      if (a.scheduled_time && b.scheduled_time) return a.scheduled_time.localeCompare(b.scheduled_time);
      if (a.scheduled_time || b.scheduled_time) return a.scheduled_time ? -1 : 1;
      return a.created_at.localeCompare(b.created_at);
    };
    return Array.from(byPet.entries())
      .map(([key, g]) => ({ key, ...g, items: [...g.items].sort(sortByTime) }))
      .sort((a, b) => (a.petName ?? "￿").localeCompare(b.petName ?? "￿"));
  }, [tasks]);

  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const pendingCount = groups.reduce((sum, g) => sum + g.items.filter((t) => !t.completed).length, 0);

  const handleAdminister = async (id: string) => {
    try {
      await markAdministered.mutateAsync(id);
      toast.success("Somministrazione registrata");
    } catch (err: any) {
      toast.error(err.message || "Errore nella registrazione");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farmaci</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Somministrazioni previste dai piani di cura, per {pet.singular}.
          </p>
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
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {isSelectedToday ? "Somministrazioni di oggi" : `Somministrazioni — ${format(selectedDate, "dd MMM yyyy", { locale: it })}`}
            {totalCount > 0 && ` (${pendingCount} da fare su ${totalCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessun farmaco da somministrare per questa data.
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <PawPrint className="h-4 w-4 text-muted-foreground" />
                    {g.petName ?? "Senza pet associato"}
                  </div>
                  <div className="space-y-1">
                    {g.items.map((t) => (
                      <div key={t.id} className="flex items-start gap-2.5 py-2 border-b last:border-0 flex-wrap sm:flex-nowrap">
                        {t.scheduled_time && (
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-0.5 shrink-0 mt-1.5 w-12">
                            <Clock className="h-3 w-3" /> {t.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium", t.completed && "text-muted-foreground")}>{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                          {t.booking?.booking_number && (
                            <Badge variant="secondary" className="text-xs mt-1">{t.booking.booking_number}</Badge>
                          )}
                        </div>
                        {t.completed ? (
                          <div className="shrink-0 text-right">
                            <Badge className="bg-success text-success-foreground gap-1 text-xs">
                              <Check className="h-3 w-3" /> Somministrato
                            </Badge>
                            {t.completed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                da {t.completed_by ? (userNameById.get(t.completed_by) ?? "Staff") : "Staff"} alle {format(new Date(t.completed_at), "HH:mm")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="outline" className="shrink-0 gap-1.5"
                            onClick={() => handleAdminister(t.id)}
                            disabled={markAdministered.isPending}
                          >
                            <Check className="h-3.5 w-3.5" /> Segna come somministrato
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
