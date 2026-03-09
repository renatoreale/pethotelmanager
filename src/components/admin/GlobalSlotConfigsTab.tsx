import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGlobalSlotConfigs, useUpsertGlobalSlotConfig, useDeleteGlobalSlotConfig,
} from "@/hooks/useGlobalConfig";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function GlobalSlotConfigsTab() {
  const { data: slots, isLoading } = useGlobalSlotConfigs();
  const upsert = useUpsertGlobalSlotConfig();
  const remove = useDeleteGlobalSlotConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [bulkMode, setBulkMode] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [duration, setDuration] = useState(30);
  const [maxAppointments, setMaxAppointments] = useState(1);
  const [appointmentType, setAppointmentType] = useState("check_in");
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setDayOfWeek(0);
    setStartTime("09:00");
    setEndTime("12:00");
    setDuration(30);
    setMaxAppointments(1);
    setAppointmentType("check_in");
    setIsActive(true);
    setBulkMode(false);
    setDialogOpen(true);
  };

  const openEdit = (slot: any) => {
    setEditing(slot);
    setDayOfWeek(slot.day_of_week);
    setStartTime(slot.start_time?.slice(0, 5));
    setEndTime(slot.end_time?.slice(0, 5));
    setDuration(slot.slot_duration_minutes);
    setMaxAppointments(slot.max_appointments);
    setAppointmentType(slot.appointment_type);
    setIsActive(slot.is_active);
    setBulkMode(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (bulkMode) {
      for (let d = 0; d < 7; d++) {
        await upsert.mutateAsync({
          day_of_week: d,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: duration,
          max_appointments: maxAppointments,
          is_active: isActive,
          appointment_type: appointmentType,
        });
      }
      toast.success("Slot globali creati per tutti i giorni");
    } else {
      await upsert.mutateAsync({
        id: editing?.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: duration,
        max_appointments: maxAppointments,
        is_active: isActive,
        appointment_type: appointmentType,
      });
      toast.success(editing ? "Slot globale aggiornato" : "Slot globale creato");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleting) {
      await remove.mutateAsync(deleting);
      toast.success("Slot globale eliminato");
      setDeleting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Slot Appuntamenti (Template Globale)</CardTitle>
            <CardDescription>
              Questi slot verranno copiati automaticamente in ogni nuova pensione creata
            </CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuovo Slot</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !slots?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessun slot globale configurato</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giorno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Durata</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{DAYS[slot.day_of_week]}</TableCell>
                      <TableCell>
                        <Badge variant={slot.appointment_type === "check_in" ? "default" : "secondary"}>
                          {slot.appointment_type === "check_in" ? "Check-in" : "Check-out"}
                        </Badge>
                      </TableCell>
                      <TableCell>{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</TableCell>
                      <TableCell>{slot.slot_duration_minutes} min</TableCell>
                      <TableCell>{slot.max_appointments}</TableCell>
                      <TableCell>
                        <Badge variant={slot.is_active ? "default" : "outline"}>
                          {slot.is_active ? "Attivo" : "Disattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(slot)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(slot.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Slot Globale" : "Nuovo Slot Globale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editing && (
              <div className="flex items-center gap-2">
                <Switch checked={bulkMode} onCheckedChange={setBulkMode} />
                <Label>Tutti i giorni</Label>
              </div>
            )}
            {!bulkMode && (
              <div className="space-y-2">
                <Label>Giorno</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => (<SelectItem key={i} value={String(i)}>{d}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="check_out">Check-out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Inizio</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
              <div className="space-y-2"><Label>Fine</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Durata (min)</Label><Input type="number" min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Max appuntamenti</Label><Input type="number" min={1} value={maxAppointments} onChange={(e) => setMaxAppointments(Number(e.target.value))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{editing ? "Salva" : "Crea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare lo slot globale?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione non influenzerà le pensioni già create.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
