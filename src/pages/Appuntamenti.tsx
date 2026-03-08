import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { CalendarIcon, CheckCircle2, XCircle, Clock, LogIn, LogOut, Trash2, Pencil, Search } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAppointmentsByDate,
  useConfirmAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
  useSlotConfigsForDay,
  useAppointmentCounts,
  generateTimeSlots,
  type AppointmentWithDetails,
} from "@/hooks/useAppointments";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getDay, parseISO } from "date-fns";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";

export default function Appuntamenti() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deleting, setDeleting] = useState<AppointmentWithDetails | null>(null);
  const [editing, setEditing] = useState<AppointmentWithDetails | null>(null);
  const [search, setSearch] = useState("");
  const [schedulingBooking, setSchedulingBooking] = useState<any>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useAppointmentsByDate(dateStr);
  const confirmAppointment = useConfirmAppointment();
  const deleteAppointment = useDeleteAppointment();
  const updateAppointment = useUpdateAppointment();

  // Filter appointments by search
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter((a) => {
      const client = a.booking?.client;
      const clientName = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.toLowerCase();
      const catNames = a.booking?.booking_cats?.map(bc => bc.cat?.name ?? "").join(" ").toLowerCase() ?? "";
      const bookingNum = a.booking?.booking_number?.toLowerCase() ?? "";
      const email = (client?.email ?? "").toLowerCase();
      const phone = (client?.phone ?? "").toLowerCase();
      return clientName.includes(q) || catNames.includes(q) || bookingNum.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [appointments, search]);

  const checkInAppts = useMemo(() =>
    filteredAppointments.filter(a => a.appointment_type === "check_in"),
    [filteredAppointments]
  );
  const checkOutAppts = useMemo(() =>
    filteredAppointments.filter(a => a.appointment_type === "check_out"),
    [filteredAppointments]
  );

  const handleConfirmToggle = async (appt: AppointmentWithDetails) => {
    try {
      await confirmAppointment.mutateAsync({ id: appt.id, confirmed: !appt.confirmed });
      toast.success(appt.confirmed ? "Conferma rimossa" : "Appuntamento confermato");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAppointment.mutateAsync({ id: deleting.id, bookingId: deleting.booking_id });
      toast.success("Appuntamento eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  const extractTime = (isoStr: string) => {
    const tIndex = isoStr.indexOf("T");
    return tIndex >= 0 ? isoStr.slice(tIndex + 1, tIndex + 6) : "--:--";
  };

  const renderTable = (appts: AppointmentWithDetails[], type: "check_in" | "check_out") => {
    if (!appts.length) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <Clock className="mx-auto h-10 w-10 mb-3 opacity-30" />
          Nessun appuntamento {type === "check_in" ? "check-in" : "check-out"} per questa data
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Orario</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Gatti</TableHead>
              <TableHead>N° Prenotazione</TableHead>
              <TableHead>Stato Prenotazione</TableHead>
              <TableHead className="w-[100px]">Confermato</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-[80px]">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appts.map((appt) => {
              const time = extractTime(appt.scheduled_at);
              const client = appt.booking?.client;
              const cats = appt.booking?.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
              const bookingStatus = appt.booking?.status ?? "";

              return (
                <TableRow key={appt.id} className={appt.confirmed ? "bg-green-50/50 dark:bg-green-950/20" : ""}>
                  <TableCell className="font-mono text-base font-semibold">{time}</TableCell>
                  <TableCell className="font-medium">
                    {client ? `${client.first_name} ${client.last_name}` : "—"}
                    {client?.phone && (
                      <span className="block text-xs text-muted-foreground">{client.phone}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{cats}</TableCell>
                  <TableCell className="font-mono text-sm">{appt.booking?.booking_number ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={bookingStatus} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirmToggle(appt)}
                      className={cn(
                        "gap-1",
                        appt.confirmed
                          ? "text-green-600 hover:text-green-700"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {appt.confirmed ? (
                        <><CheckCircle2 className="h-4 w-4" /> Sì</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> No</>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {appt.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(appt)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(appt)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appuntamenti</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci gli appuntamenti di check-in e check-out</p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            ← Ieri
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) setSelectedDate(d);
                  setCalendarOpen(false);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            Domani →
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Oggi
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per n° prenotazione, cliente, gatto, email, telefono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="gap-1 text-sm py-1 px-3">
          <LogIn className="h-3.5 w-3.5" />
          {checkInAppts.length} Check-in
        </Badge>
        <Badge variant="outline" className="gap-1 text-sm py-1 px-3">
          <LogOut className="h-3.5 w-3.5" />
          {checkOutAppts.length} Check-out
        </Badge>
        <Badge variant="outline" className="gap-1 text-sm py-1 px-3">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {filteredAppointments.filter(a => a.confirmed).length} Confermati
        </Badge>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : (
        <Tabs defaultValue="check_in" className="space-y-4">
          <TabsList>
            <TabsTrigger value="check_in" className="gap-2">
              <LogIn className="h-4 w-4" />
              Check-in ({checkInAppts.length})
            </TabsTrigger>
            <TabsTrigger value="check_out" className="gap-2">
              <LogOut className="h-4 w-4" />
              Check-out ({checkOutAppts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="check_in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appuntamenti Check-in</CardTitle>
                <CardDescription>Arrivi previsti per {format(selectedDate, "dd MMMM yyyy", { locale: it })}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(checkInAppts, "check_in")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="check_out">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appuntamenti Check-out</CardTitle>
                <CardDescription>Partenze previste per {format(selectedDate, "dd MMMM yyyy", { locale: it })}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(checkOutAppts, "check_out")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'appuntamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Appuntamento delle ${extractTime(deleting.scheduled_at)} per ${deleting.booking?.client?.first_name ?? ""} ${deleting.booking?.client?.last_name ?? ""}. Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <EditAppointmentDialog
          appointment={editing}
          open={!!editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          onSave={async (newTime: string) => {
            const date = editing.scheduled_at.slice(0, 10);
            await updateAppointment.mutateAsync({
              id: editing.id,
              scheduled_at: `${date}T${newTime}:00`,
            });
            toast.success("Appuntamento aggiornato");
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confermata: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    appuntamento_in_fissato: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    appuntamento_out_fissato: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    appuntamento_in_out_fissato: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    check_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    check_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    chiusa: "bg-muted text-muted-foreground",
    cancellata: "bg-destructive/10 text-destructive",
  };
  const labels: Record<string, string> = {
    confermata: "Confermata",
    appuntamento_in_fissato: "Appt. IN fissato",
    appuntamento_out_fissato: "Appt. OUT fissato",
    appuntamento_in_out_fissato: "Appt. IN-OUT fissati",
    check_in: "Check-in",
    in_corso: "In corso",
    check_out: "Check-out",
    chiusa: "Chiusa",
    cancellata: "Cancellata",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// Edit appointment dialog — shows available slots for the appointment's date
function EditAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onSave,
}: {
  appointment: AppointmentWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (newTime: string) => Promise<void>;
}) {
  const currentTime = (() => {
    const tIndex = appointment.scheduled_at.indexOf("T");
    return tIndex >= 0 ? appointment.scheduled_at.slice(tIndex + 1, tIndex + 6) : "";
  })();
  const [selectedTime, setSelectedTime] = useState<string>(currentTime);
  const [saving, setSaving] = useState(false);

  const dateStr = appointment.scheduled_at.slice(0, 10);
  const jsDay = getDay(parseISO(dateStr));
  const dow = jsDay === 0 ? 6 : jsDay - 1;

  const { data: slotConfigs } = useSlotConfigsForDay(appointment.appointment_type, dow);
  const { data: counts } = useAppointmentCounts(dateStr, appointment.appointment_type);

  const availableSlots = useMemo(() => {
    if (!slotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number }[] = [];
    for (const config of slotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = counts?.[time] ?? 0;
        // Don't count the current appointment as "used"
        if (time === currentTime) used = Math.max(0, used - 1);
        slots.push({ time, available: config.max_appointments - used, maxAppts: config.max_appointments });
      }
    }
    return slots;
  }, [slotConfigs, counts, currentTime]);

  const handleSave = async () => {
    if (!selectedTime || selectedTime === currentTime) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(selectedTime);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica Appuntamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Tipo:</span> {appointment.appointment_type === "check_in" ? "Check-in" : "Check-out"}</p>
            <p><span className="text-muted-foreground">Data:</span> {format(parseISO(dateStr), "EEEE dd MMMM yyyy", { locale: it })}</p>
            <p><span className="text-muted-foreground">Cliente:</span> {appointment.booking?.client?.first_name} {appointment.booking?.client?.last_name}</p>
            <p><span className="text-muted-foreground">Orario attuale:</span> <span className="font-mono font-semibold">{currentTime}</span></p>
          </div>

          <div className="space-y-2">
            <Label>Seleziona nuovo orario</Label>
            {!availableSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={slot.available <= 0 && slot.time !== currentTime}
                    onClick={() => setSelectedTime(slot.time)}
                  >
                    {slot.time}
                    {slot.time === currentTime && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">attuale</Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving || selectedTime === currentTime}>
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
