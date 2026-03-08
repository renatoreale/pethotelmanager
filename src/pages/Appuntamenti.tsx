import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, CheckCircle2, XCircle, Clock, LogIn, LogOut, Trash2, Pencil, CalendarPlus } from "lucide-react";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, parseISO, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAppointmentsByDate,
  useAppointmentsByDateRange,
  useAllAppointments,
  useConfirmAppointment,
  useDeleteAppointment,
  type AppointmentWithDetails,
} from "@/hooks/useAppointments";
import { useBookings } from "@/hooks/useBookings";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";
import { EditCheckoutDialog, type CheckoutBookingData } from "@/components/appointments/EditCheckoutDialog";

type ViewMode = "giorno" | "settimana" | "mese" | "personalizzato";

export default function Appuntamenti() {
  const [viewMode, setViewMode] = useState<ViewMode>("giorno");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rangeFrom, setRangeFrom] = useState<Date>(new Date());
  const [rangeTo, setRangeTo] = useState<Date>(addDays(new Date(), 7));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarFromOpen, setCalendarFromOpen] = useState(false);
  const [calendarToOpen, setCalendarToOpen] = useState(false);
  const [deleting, setDeleting] = useState<AppointmentWithDetails | null>(null);
  
  const [editingCheckout, setEditingCheckout] = useState<AppointmentWithDetails | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState<CheckoutBookingData | null>(null);
  const [search, setSearch] = useState("");
  const [schedulingBooking, setSchedulingBooking] = useState<any>(null);

  // Compute date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "giorno") {
      const d = format(selectedDate, "yyyy-MM-dd");
      return { startDate: d, endDate: d };
    }
    if (viewMode === "settimana") {
      const s = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const e = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return { startDate: format(s, "yyyy-MM-dd"), endDate: format(e, "yyyy-MM-dd") };
    }
    if (viewMode === "mese") {
      const s = startOfMonth(selectedDate);
      const e = endOfMonth(selectedDate);
      return { startDate: format(s, "yyyy-MM-dd"), endDate: format(e, "yyyy-MM-dd") };
    }
    // personalizzato
    return { startDate: format(rangeFrom, "yyyy-MM-dd"), endDate: format(rangeTo, "yyyy-MM-dd") };
  }, [viewMode, selectedDate, rangeFrom, rangeTo]);

  const isRange = viewMode !== "giorno";
  const hasSearch = search.trim().length >= 2;

  // Use single-day hook for "giorno", range hook for others
  const { data: dayAppointments, isLoading: dayLoading } = useAppointmentsByDate(
    !isRange && !hasSearch ? startDate : undefined
  );
  const { data: rangeAppointments, isLoading: rangeLoading } = useAppointmentsByDateRange(
    isRange && !hasSearch ? startDate : undefined,
    isRange && !hasSearch ? endDate : undefined
  );
  const { data: allAppointments, isLoading: allLoading } = useAllAppointments(hasSearch);

  const appointments = hasSearch ? allAppointments : (isRange ? rangeAppointments : dayAppointments);
  const isLoading = hasSearch ? allLoading : (isRange ? rangeLoading : dayLoading);

  const confirmAppointment = useConfirmAppointment();
  const deleteAppointment = useDeleteAppointment();

  // Fetch confirmed bookings (no appointments yet)
  const { data: allBookings } = useBookings();
  const confirmedBookings = useMemo(() => {
    if (!allBookings) return [];
    let result = allBookings.filter((b: any) => b.status === "confermata");
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      result = result.filter((b: any) => {
        const clientName = `${b.client?.first_name ?? ""} ${b.client?.last_name ?? ""}`.toLowerCase();
        const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name ?? "").join(" ").toLowerCase();
        const bookingNum = (b.booking_number ?? "").toLowerCase();
        const email = (b.client?.email ?? "").toLowerCase();
        const phone = (b.client?.phone ?? "").toLowerCase();
        return clientName.includes(q) || catNames.includes(q) || bookingNum.includes(q) || email.includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [allBookings, search]);

  // Filter by search
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    // Exclude closed/cancelled/refunded bookings
    let result = appointments.filter((a) => !["chiusa", "cancellata", "rimborsata"].includes(a.booking?.status ?? ""));
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter((a) => {
      const client = a.booking?.client;
      const clientName = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.toLowerCase();
      const catNames = a.booking?.booking_cats?.map(bc => bc.cat?.name ?? "").join(" ").toLowerCase() ?? "";
      const bookingNum = a.booking?.booking_number?.toLowerCase() ?? "";
      const email = (client?.email ?? "").toLowerCase();
      const phone = (client?.phone ?? "").toLowerCase();
      return clientName.includes(q) || catNames.includes(q) || bookingNum.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [appointments, search]);

  const checkInAppts = useMemo(() => filteredAppointments.filter(a => a.appointment_type === "check_in"), [filteredAppointments]);
  const checkOutAppts = useMemo(() => filteredAppointments.filter(a => a.appointment_type === "check_out"), [filteredAppointments]);

  // Group by date for range views
  const groupByDate = (appts: AppointmentWithDetails[]) => {
    const groups: Record<string, AppointmentWithDetails[]> = {};
    for (const a of appts) {
      const d = a.scheduled_at.slice(0, 10);
      if (!groups[d]) groups[d] = [];
      groups[d].push(a);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

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

  const navigatePrev = () => {
    if (viewMode === "giorno") setSelectedDate(d => subDays(d, 1));
    else if (viewMode === "settimana") setSelectedDate(d => subWeeks(d, 1));
    else if (viewMode === "mese") setSelectedDate(d => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === "giorno") setSelectedDate(d => addDays(d, 1));
    else if (viewMode === "settimana") setSelectedDate(d => addWeeks(d, 1));
    else if (viewMode === "mese") setSelectedDate(d => addMonths(d, 1));
  };

  const prevLabel = viewMode === "giorno" ? "← Ieri" : "← Prec.";
  const nextLabel = viewMode === "giorno" ? "Domani →" : "Succ. →";

  const dateLabel = useMemo(() => {
    if (viewMode === "giorno") return format(selectedDate, "EEEE dd MMMM yyyy", { locale: it });
    if (viewMode === "settimana") {
      const s = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const e = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(s, "dd MMM", { locale: it })} – ${format(e, "dd MMM yyyy", { locale: it })}`;
    }
    if (viewMode === "mese") return format(selectedDate, "MMMM yyyy", { locale: it });
    return `${format(rangeFrom, "dd/MM/yyyy")} – ${format(rangeTo, "dd/MM/yyyy")}`;
  }, [viewMode, selectedDate, rangeFrom, rangeTo]);

  const renderApptRow = (appt: AppointmentWithDetails) => {
    const time = extractTime(appt.scheduled_at);
    const client = appt.booking?.client;
    const cats = appt.booking?.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
    const bookingStatus = appt.booking?.status ?? "";
    const isIn = appt.appointment_type === "check_in";
    const isLocked = ["chiusa", "cancellata", "rimborsata"].includes(bookingStatus);
    const isInCorso = bookingStatus === "in_corso";

    // Check if this in_corso booking already has a check_out appointment
    const hasCheckoutAppt = isInCorso && isIn
      ? (filteredAppointments ?? []).some(a => a.booking_id === appt.booking_id && a.appointment_type === "check_out")
        || (appointments ?? []).some(a => a.booking_id === appt.booking_id && a.appointment_type === "check_out")
      : false;

    return (
      <TableRow key={appt.id} className={appt.confirmed ? "bg-green-50/50 dark:bg-green-950/20" : ""}>
        <TableCell className="font-mono text-base font-semibold">{time}</TableCell>
        <TableCell>
          <Badge variant="outline" className={cn("text-xs", isIn ? "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" : "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300")}>
            {isIn ? <><LogIn className="h-3 w-3 mr-1" />IN</> : <><LogOut className="h-3 w-3 mr-1" />OUT</>}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">
          {client ? `${client.first_name} ${client.last_name}` : "—"}
          {client?.phone && (
            <span className="block text-xs text-muted-foreground">{client.phone}</span>
          )}
        </TableCell>
        <TableCell className="text-sm">{cats}</TableCell>
        <TableCell className="font-mono text-sm">{appt.booking?.booking_number ?? "—"}</TableCell>
        <TableCell><StatusBadge status={bookingStatus} /></TableCell>
        <TableCell>
          {!isLocked ? (
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
              {appt.confirmed ? <><CheckCircle2 className="h-4 w-4" /> Sì</> : <><XCircle className="h-4 w-4" /> No</>}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{appt.confirmed ? "Sì" : "No"}</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{appt.notes || "—"}</TableCell>
        <TableCell>
          {!isLocked ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditingCheckout(appt);
              }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(appt)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              {isInCorso && isIn && !hasCheckoutAppt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    if (appt.booking) {
                      setCreatingCheckout({
                        id: appt.booking.id,
                        booking_number: appt.booking.booking_number,
                        status: appt.booking.status,
                        check_in_date: appt.booking.check_in_date,
                        check_out_date: appt.booking.check_out_date,
                        total_amount: appt.booking.total_amount,
                        client: appt.booking.client ? { first_name: appt.booking.client.first_name, last_name: appt.booking.client.last_name } : undefined,
                        booking_cats: appt.booking.booking_cats,
                      });
                    }
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Fissa OUT
                </Button>
              )}
            </div>
          ) : (
            <div className="w-[68px] shrink-0" />
          )}
        </TableCell>
      </TableRow>
    );
  };

  const tableHeaders = (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[80px]">Orario</TableHead>
        <TableHead className="w-[80px]">Tipo</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead>Gatti</TableHead>
        <TableHead>N° Prenotazione</TableHead>
        <TableHead>Stato</TableHead>
        <TableHead className="w-[100px]">Confermato</TableHead>
        <TableHead>Note</TableHead>
        <TableHead className="w-[80px]">Azioni</TableHead>
      </TableRow>
    </TableHeader>
  );

  const renderAllAppointments = () => {
    if (!filteredAppointments.length) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <Clock className="mx-auto h-10 w-10 mb-3 opacity-30" />
          Nessun appuntamento trovato
        </div>
      );
    }

    if (isRange || hasSearch) {
      const grouped = groupByDate(filteredAppointments);
      return (
        <div className="space-y-6">
          {grouped.map(([date, dayAppts]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base capitalize">
                  {format(parseISO(date), "EEEE dd MMMM", { locale: it })}
                </CardTitle>
                <CardDescription>
                  {dayAppts.filter(a => a.appointment_type === "check_in").length} check-in, {dayAppts.filter(a => a.appointment_type === "check_out").length} check-out
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    {tableHeaders}
                    <TableBody>
                      {dayAppts.map((appt) => renderApptRow(appt))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Single day view
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appuntamenti</CardTitle>
          <CardDescription className="capitalize">
            {format(selectedDate, "EEEE dd MMMM yyyy", { locale: it })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              {tableHeaders}
              <TableBody>
                {filteredAppointments.map((appt) => renderApptRow(appt))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appuntamenti</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestisci gli appuntamenti di check-in e check-out</p>
        </div>

        {/* View mode selector */}
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="giorno">Giorno</SelectItem>
            <SelectItem value="settimana">Settimana</SelectItem>
            <SelectItem value="mese">Mese</SelectItem>
            <SelectItem value="personalizzato">Dal – Al</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date navigation */}
      {viewMode !== "personalizzato" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={navigatePrev}>{prevLabel}</Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[220px] justify-start gap-2 capitalize">
                <CalendarIcon className="h-4 w-4" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) setSelectedDate(d); setCalendarOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={navigateNext}>{nextLabel}</Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Oggi</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={calendarFromOpen} onOpenChange={setCalendarFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                Dal: {format(rangeFrom, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={rangeFrom}
                onSelect={(d) => { if (d) setRangeFrom(d); setCalendarFromOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Popover open={calendarToOpen} onOpenChange={setCalendarToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-start gap-2">
                <CalendarIcon className="h-4 w-4" />
                Al: {format(rangeTo, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={rangeTo}
                onSelect={(d) => { if (d) setRangeTo(d); setCalendarToOpen(false); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Search bar with autocomplete */}
      <AutocompleteSearch
        value={search}
        onChange={setSearch}
        placeholder="Cerca per n° prenotazione, cliente, gatto, email, telefono..."
        className="max-w-sm"
      />




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
        {confirmedBookings.length > 0 && (
          <Badge variant="outline" className="gap-1 text-sm py-1 px-3 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
            <CalendarPlus className="h-3.5 w-3.5" />
            {confirmedBookings.length} Da programmare
          </Badge>
        )}
      </div>

      {/* Confirmed bookings without appointments */}
      {confirmedBookings.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Prenotazioni confermate — da programmare
            </CardTitle>
            <CardDescription>
              Prenotazioni confermate che non hanno ancora un appuntamento di check-in o check-out fissato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gatti</TableHead>
                    <TableHead>N° Prenotazione</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[120px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmedBookings.map((b: any) => {
                    const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
                    const cats = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—";
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          {clientName}
                          {b.client?.phone && <span className="block text-xs text-muted-foreground">{b.client.phone}</span>}
                        </TableCell>
                        <TableCell className="text-sm">{cats}</TableCell>
                        <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(b.check_in_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(b.check_out_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setSchedulingBooking(b)}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            Fissa appuntamento
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : (
        renderAllAppointments()
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


      <AppointmentScheduleDialog
        open={!!schedulingBooking}
        onOpenChange={(open) => { if (!open) setSchedulingBooking(null); }}
        booking={schedulingBooking}
      />

      {(editingCheckout || creatingCheckout) && (
        <EditCheckoutDialog
          open={!!(editingCheckout || creatingCheckout)}
          onOpenChange={(open) => { if (!open) { setEditingCheckout(null); setCreatingCheckout(null); } }}
          appointment={editingCheckout}
          bookingData={creatingCheckout}
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
