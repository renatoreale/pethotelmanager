import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOccupancyData } from "@/components/OccupancyGrid";
import { Button } from "@/components/ui/button";
import { Cat, CalendarCheck, LogIn, LogOut, CreditCard, AlertTriangle, CalendarIcon, AlertCircle, Calendar as CalendarIconAlt } from "lucide-react";
import { AvailabilityCheckDialog } from "@/components/AvailabilityCheckDialog";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useAllPayments } from "@/hooks/usePayments";
import { usePermissions } from "@/hooks/usePermissions";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isToday as isTodayFn, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivo",
  confermata: "Confermata",
  appuntamento_in_fissato: "App. IN",
  appuntamento_out_fissato: "App. OUT",
  appuntamento_in_out_fissato: "App. IN-OUT",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

const STATUS_COLORS: Record<string, string> = {
  preventivo: "bg-muted text-muted-foreground",
  confermata: "bg-primary/15 text-primary",
  appuntamento_in_fissato: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  appuntamento_out_fissato: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  appuntamento_in_out_fissato: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  check_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  check_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  chiusa: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/15 text-destructive",
  rimborsata: "bg-destructive/15 text-destructive",
  scaduto: "bg-warning/15 text-warning",
};

export default function Index() {
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: tenantConfig } = useTenantConfig();
  const { data: allPayments } = useAllPayments();
  const { canRead, isOperatoreRestricted } = usePermissions();
  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 4;
  const { bookingOccupancy } = useOccupancyData(bookings ?? [], occupancyDays);

  const canSeeRevenue = canRead("dashboard_revenue");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appointmentBooking, setAppointmentBooking] = useState<any>(null);
  const missingApptRef = useRef<HTMLDivElement>(null);
  const missingCheckOutRef = useRef<HTMLDivElement>(null);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isTodayFn(selectedDate);
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const yearStart = format(startOfYear(selectedDate), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(selectedDate), "yyyy-MM-dd");

  // For operatore: restrict to today and tomorrow only
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const stats = useMemo(() => {
    if (!bookings) return null;

    // Cats in structure on selected date (in_corso bookings overlapping that date)
    const inCorsoOverlapping = bookings.filter(b => b.status === "in_corso" && b.check_in_date <= selectedDateStr && b.check_out_date >= selectedDateStr);
    const catsInStructure = inCorsoOverlapping.reduce((sum, b) => sum + (b.booking_cats?.length ?? 0), 0);

    // Occupancy by cage type: use same occupancy_rule_days logic as OccupazioneCasette
    let singoleOccupied = 0;
    let doppieOccupied = 0;
    for (const bo of bookingOccupancy) {
      if (bo.occupiedDates.has(selectedDateStr)) {
        if (bo.booking.cage_pool_type === "singola") singoleOccupied += bo.booking.units_occupied;
        else doppieOccupied += bo.booking.units_occupied;
      }
    }

    // Active bookings overlapping selected date
    const activeStatuses = ["confermata", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato", "check_in", "in_corso"];
    const activeBookings = bookings.filter(b => activeStatuses.includes(b.status) && b.check_in_date <= selectedDateStr && b.check_out_date >= selectedDateStr);

    // Check-ins on selected date (or today/tomorrow for operatore)
    let checkInsToday = bookings.filter(b => b.check_in_date === selectedDateStr && !["preventivo", "cancellata", "rimborsata", "scaduto"].includes(b.status));
    let checkOutsToday = bookings.filter(b => b.check_out_date === selectedDateStr && !["preventivo", "cancellata", "rimborsata", "scaduto"].includes(b.status));

    // For operatore, also get tomorrow's data
    const checkInsTomorrow = bookings.filter(b => b.check_in_date === tomorrowStr && !["preventivo", "cancellata", "rimborsata", "scaduto"].includes(b.status));
    const checkOutsTomorrow = bookings.filter(b => b.check_out_date === tomorrowStr && !["preventivo", "cancellata", "rimborsata", "scaduto"].includes(b.status));

    // Monthly revenue (month of selected date)
    const monthPayments = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= monthStart && pDate <= monthEnd && p.payment_type !== "rimborso";
    });
    const monthRefunds = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= monthStart && pDate <= monthEnd && p.payment_type === "rimborso";
    });
    const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0) - monthRefunds.reduce((s, p) => s + Number(p.amount), 0);

    // Yearly revenue
    const yearPayments = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= yearStart && pDate <= yearEnd && p.payment_type !== "rimborso";
    });
    const yearRefunds = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= yearStart && pDate <= yearEnd && p.payment_type === "rimborso";
    });
    const yearRevenue = yearPayments.reduce((s, p) => s + Number(p.amount), 0) - yearRefunds.reduce((s, p) => s + Number(p.amount), 0);

    // Bookings with activity on the selected date
    const dayBookings = bookings.filter(b =>
      !["cancellata", "rimborsata"].includes(b.status) &&
      (b.check_in_date === selectedDateStr || b.check_out_date === selectedDateStr ||
       (b.check_in_date <= selectedDateStr && b.check_out_date >= selectedDateStr))
    ).slice(0, 5);

    // Expiring preventivi (preventivo with check_in_date <= selected date + 3 days)
    const soonDate = new Date(selectedDate);
    soonDate.setDate(soonDate.getDate() + 3);
    const soonStr = format(soonDate, "yyyy-MM-dd");
    const expiringPreventivi = bookings.filter(b => b.status === "preventivo" && b.check_in_date >= selectedDateStr && b.check_in_date <= soonStr);

    // Confirmed bookings with check-in in next 4 days but no appointment IN scheduled
    const soon4Date = format(addDays(new Date(), 4), "yyyy-MM-dd");
    const missingAppointment = bookings.filter(b => {
      if (b.status !== "confermata") return false;
      if (b.check_in_date < todayStr || b.check_in_date > soon4Date) return false;
      const hasCheckInAppt = (b.appointments ?? []).some((a: any) => a.appointment_type === "check_in");
      return !hasCheckInAppt;
    });

    // Active bookings with check-out in next 4 days but no appointment OUT scheduled
    const activeOutStatuses = ["confermata", "appuntamento_in_fissato", "check_in", "in_corso"];
    const missingCheckOutAppt = bookings.filter(b => {
      if (!activeOutStatuses.includes(b.status)) return false;
      if (b.check_out_date < todayStr || b.check_out_date > soon4Date) return false;
      const hasCheckOutAppt = (b.appointments ?? []).some((a: any) => a.appointment_type === "check_out");
      return !hasCheckOutAppt;
    });

    return {
      catsInStructure,
      singoleOccupied,
      doppieOccupied,
      activeBookings: activeBookings.length,
      checkInsToday: checkInsToday.length,
      checkOutsToday: checkOutsToday.length,
      checkInsTomorrow: checkInsTomorrow.length,
      checkOutsTomorrow: checkOutsTomorrow.length,
      monthRevenue,
      yearRevenue,
      dayBookings,
      expiringPreventivi: expiringPreventivi.length,
      missingAppointment,
      missingCheckOutAppt,
    };
  }, [bookings, allPayments, bookingOccupancy, selectedDateStr, monthStart, monthEnd, yearStart, yearEnd, todayStr, tomorrowStr]);

  const numSingole = tenantConfig?.num_singole ?? 0;
  const numDoppie = tenantConfig?.num_doppie ?? 0;
  const totalSlots = numSingole + numDoppie;

  if (loadingBookings) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Caricamento...</p>
        </div>
      </div>
    );
  }

  const s = stats ?? {
    catsInStructure: 0, singoleOccupied: 0, doppieOccupied: 0,
    activeBookings: 0, checkInsToday: 0, checkOutsToday: 0,
    checkInsTomorrow: 0, checkOutsTomorrow: 0,
    monthRevenue: 0, yearRevenue: 0, dayBookings: [], expiringPreventivi: 0, missingAppointment: [] as any[], missingCheckOutAppt: [] as any[],
  };

  // Build KPI cards based on permissions
  const kpis = [
    {
      title: "Gatti in struttura",
      value: String(s.catsInStructure),
      subtitle: `su ${totalSlots} posti totali`,
      icon: Cat,
      color: "text-primary",
      bg: "bg-primary/10",
      show: true,
    },
    {
      title: "Prenotazioni attive",
      value: String(s.activeBookings),
      subtitle: "confermate o in corso",
      icon: CalendarCheck,
      color: "text-accent",
      bg: "bg-accent/10",
      show: !isOperatoreRestricted,
    },
    {
      title: isSelectedToday ? "Check-in oggi" : "Check-in",
      value: String(s.checkInsToday),
      subtitle: isSelectedToday ? "previsti per oggi" : `previsti per il ${format(selectedDate, "dd MMM", { locale: it })}`,
      icon: LogIn,
      color: "text-success",
      bg: "bg-success/10",
      show: true,
    },
    {
      title: isSelectedToday ? "Check-out oggi" : "Check-out",
      value: String(s.checkOutsToday),
      subtitle: isSelectedToday ? "previsti per oggi" : `previsti per il ${format(selectedDate, "dd MMM", { locale: it })}`,
      icon: LogOut,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      show: true,
    },
    {
      title: "Incasso anno",
      value: `€ ${s.yearRevenue.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
      subtitle: format(selectedDate, "yyyy", { locale: it }),
      icon: CreditCard,
      color: "text-primary",
      bg: "bg-primary/10",
      show: canSeeRevenue,
    },
    {
      title: "Incasso mese",
      value: `€ ${s.monthRevenue.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
      subtitle: format(selectedDate, "MMMM yyyy", { locale: it }),
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning/10",
      show: canSeeRevenue,
    },
  ].filter(k => k.show);

  const singolePct = numSingole > 0 ? Math.round((s.singoleOccupied / numSingole) * 100) : 0;
  const doppiePct = numDoppie > 0 ? Math.round((s.doppieOccupied / numDoppie) * 100) : 0;
  const singoleOverbooking = s.singoleOccupied > numSingole;
  const doppieOverbooking = s.doppieOccupied > numDoppie;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSelectedToday ? "Panoramica operativa" : `Dati del ${format(selectedDate, "dd MMMM yyyy", { locale: it })}`} — {tenantConfig?.name ?? "Pensione"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOperatoreRestricted && s.missingAppointment.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 animate-pulse"
              onClick={() => missingApptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              <LogIn className="h-4 w-4" />
              {s.missingAppointment.length} IN senza app.
            </Button>
          )}
          {!isOperatoreRestricted && s.missingCheckOutAppt.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 animate-pulse"
              onClick={() => missingCheckOutRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              <LogOut className="h-4 w-4" />
              {s.missingCheckOutAppt.length} OUT senza app.
            </Button>
          )}
          {!isOperatoreRestricted && <AvailabilityCheckDialog />}
          {!isSelectedToday && !isOperatoreRestricted && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              Oggi
            </Button>
          )}
          {!isOperatoreRestricted && (
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
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className={cn("grid gap-4 sm:grid-cols-2", kpis.length >= 4 ? "lg:grid-cols-4" : kpis.length === 3 ? "lg:grid-cols-3" : "")}>
        {kpis.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operatore: Show tomorrow's check-in/out */}
      {isOperatoreRestricted && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Domani</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.checkInsTomorrow}</p>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.checkOutsTomorrow}</p>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Occupancy bar - hide for operatore */}
      {!isOperatoreRestricted && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Occupazione casette {!isSelectedToday && `— ${format(selectedDate, "dd MMM yyyy", { locale: it })}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Singole</span>
                <div className="flex items-center gap-1.5">
                  {singoleOverbooking && <AlertCircle className="h-4 w-4 text-[hsl(340,80%,35%)]" />}
                  <span className={cn("font-medium", singoleOverbooking && "text-[hsl(340,80%,35%)]")}>{s.singoleOccupied} / {numSingole}</span>
                </div>
              </div>
              <Progress value={Math.min(singolePct, 100)} className="h-2" indicatorClassName={singoleOverbooking ? "bg-[hsl(340,80%,25%)]" : undefined} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Doppie</span>
                <div className="flex items-center gap-1.5">
                  {doppieOverbooking && <AlertCircle className="h-4 w-4 text-[hsl(340,80%,35%)]" />}
                  <span className={cn("font-medium", doppieOverbooking && "text-[hsl(340,80%,35%)]")}>{s.doppieOccupied} / {numDoppie}</span>
                </div>
              </div>
              <Progress value={Math.min(doppiePct, 100)} className="h-2" indicatorClassName={doppieOverbooking ? "bg-[hsl(340,80%,25%)]" : undefined} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Bookings - hide for operatore */}
      {!isOperatoreRestricted && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {isSelectedToday ? "Prenotazioni del giorno" : `Prenotazioni — ${format(selectedDate, "dd MMM yyyy", { locale: it })}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {s.dayBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuna prenotazione per questa data</p>
            ) : (
              <div className="space-y-3">
                {s.dayBookings.map((b: any) => {
                  const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
                  const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—";
                  return (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{clientName}</p>
                        <p className="text-xs text-muted-foreground">{catNames} · {b.booking_number}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] ?? ""}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing appointment alert */}
      {!isOperatoreRestricted && s.missingAppointment.length > 0 && (
        <div ref={missingApptRef}>
          <Card className="border-none shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Appuntamento mancante — {s.missingAppointment.length} prenotazion{s.missingAppointment.length === 1 ? "e" : "i"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check-in previsto tra oggi e i prossimi 4 giorni senza appuntamento fissato
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {s.missingAppointment.map((b: any) => {
                const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
                const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—";
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{catNames} · {b.booking_number}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        Check-in: {format(new Date(b.check_in_date + "T00:00:00"), "dd MMM", { locale: it })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => setAppointmentBooking(b)}
                      >
                        <CalendarIconAlt className="h-3.5 w-3.5" />
                        Fissa appuntamento
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Missing check-out appointment alert */}
      {!isOperatoreRestricted && s.missingCheckOutAppt.length > 0 && (
        <div ref={missingCheckOutRef}>
          <Card className="border-none shadow-sm border-l-4 border-l-[hsl(25,90%,50%)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[hsl(25,90%,40%)]">
                <LogOut className="h-5 w-5" />
                Check-out senza appuntamento — {s.missingCheckOutAppt.length} prenotazion{s.missingCheckOutAppt.length === 1 ? "e" : "i"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check-out previsto tra oggi e i prossimi 4 giorni senza appuntamento fissato
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {s.missingCheckOutAppt.map((b: any) => {
                const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
                const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—";
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{clientName}</p>
                      <p className="text-xs text-muted-foreground">{catNames} · {b.booking_number}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        Check-out: {format(new Date(b.check_out_date + "T00:00:00"), "dd MMM", { locale: it })}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => setAppointmentBooking(b)}
                      >
                        <CalendarIconAlt className="h-3.5 w-3.5" />
                        Fissa appuntamento
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <AppointmentScheduleDialog
        open={!!appointmentBooking}
        onOpenChange={(open) => { if (!open) setAppointmentBooking(null); }}
        booking={appointmentBooking}
      />

      {/* Alerts - hide for operatore */}
      {!isOperatoreRestricted && s.expiringPreventivi > 0 && (
        <Card className="border-none shadow-sm border-l-4 border-l-warning">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">Attenzione</p>
              <p className="text-xs text-muted-foreground">
                {s.expiringPreventivi} preventiv{s.expiringPreventivi === 1 ? "o" : "i"} in scadenza nei prossimi 3 giorni
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
