import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOccupancyData } from "@/components/OccupancyGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Cat, Dog, LogIn, LogOut, AlertTriangle, CalendarIcon, AlertCircle,
  PawPrint, Pill, ClipboardList, Wallet,
} from "lucide-react";
import { AvailabilityCheckDialog } from "@/components/AvailabilityCheckDialog";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { usePermissions } from "@/hooks/usePermissions";
import { useTasksForDate, useCompleteTask } from "@/hooks/usePlanningTasks";
import { useUsers } from "@/hooks/useUsers";
import { format, isToday as isTodayFn, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { usePetLabels } from "@/hooks/usePetLabels";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/useDateLocale";

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

// Stati che non rappresentano un soggiorno attivo (preventivo non ancora confermato, scaduto, annullato)
const INACTIVE_STATUSES = ["preventivo", "scaduto", "cancellata", "rimborsata"];

function calcNetPaid(payments: any[]) {
  const paid = payments
    .filter((p: any) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p: any) => p.payment_type === "rimborso")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  return paid - refunded;
}
function calcRemaining(b: any) {
  return Math.max(0, Number(b.total_amount ?? 0) - calcNetPaid(b.payments ?? []));
}
function calcExtraTotal(b: any) {
  return (b.payments ?? []).filter((p: any) => p.payment_type === "extra").reduce((s: number, p: any) => s + Number(p.amount), 0);
}

type Severity = "red" | "orange" | "yellow";
interface AttentionItem {
  key: string;
  severity: Severity;
  label: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}

const SEVERITY_DOT: Record<Severity, string> = {
  red: "bg-destructive",
  orange: "bg-[hsl(25,90%,50%)]",
  yellow: "bg-warning",
};

export default function Index() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const navigate = useNavigate();
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: tenantConfig } = useTenantConfig();
  const { canRead, isOperatoreRestricted } = usePermissions();
  const pet = usePetLabels();
  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 4;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;
  const { bookingOccupancy } = useOccupancyData(bookings ?? [], occupancyDays, undefined, petType);

  const canSeeMoney = canRead("pagamenti");
  const canSeeTasks = canRead("planning");
  const canSeeCheckIn = canRead("check-in");
  const canSeeCheckOut = canRead("check-out");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appointmentBooking, setAppointmentBooking] = useState<any>(null);
  const attentionRef = useRef<HTMLDivElement>(null);
  const arrivalsRef = useRef<HTMLDivElement>(null);
  const departuresRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isTodayFn(selectedDate);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const { data: tasks } = useTasksForDate(canSeeTasks ? selectedDateStr : undefined);
  const { users: staffUsers } = useUsers();
  const completeTask = useCompleteTask();

  const stats = useMemo(() => {
    if (!bookings) return null;

    const inCorsoOverlapping = bookings.filter(b => b.status === "in_corso" && b.check_in_date <= selectedDateStr && b.check_out_date >= selectedDateStr);
    const catsInStructure = inCorsoOverlapping.reduce((sum, b) => sum + (b.booking_cats?.length ?? 0), 0);

    let singoleOccupied = 0;
    let doppieOccupied = 0;
    for (const bo of bookingOccupancy) {
      if (bo.occupiedDates.has(selectedDateStr)) {
        if (bo.booking.cage_pool_type === "singola") singoleOccupied += bo.booking.units_occupied;
        else doppieOccupied += bo.booking.units_occupied;
      }
    }

    const checkInsToday = bookings.filter(b => b.check_in_date === selectedDateStr && !INACTIVE_STATUSES.includes(b.status));
    const checkOutsToday = bookings.filter(b => b.check_out_date === selectedDateStr && !INACTIVE_STATUSES.includes(b.status));
    const checkInsTomorrow = bookings.filter(b => b.check_in_date === tomorrowStr && !INACTIVE_STATUSES.includes(b.status));
    const checkOutsTomorrow = bookings.filter(b => b.check_out_date === tomorrowStr && !INACTIVE_STATUSES.includes(b.status));

    // Saldo ancora dovuto su tutti i soggiorni attivi (non su una singola data)
    const toCollect = bookings
      .filter(b => !INACTIVE_STATUSES.includes(b.status))
      .reduce((s, b) => s + calcRemaining(b), 0);

    // Pagamenti scaduti: soggiorno già concluso ma saldo ancora aperto
    const overduePayments = bookings.filter(b =>
      !INACTIVE_STATUSES.includes(b.status) && b.check_out_date < todayStr && calcRemaining(b) > 0
    );

    // Preventivi in scadenza nei prossimi 3 giorni rispetto alla data selezionata
    const soonDate = new Date(selectedDate);
    soonDate.setDate(soonDate.getDate() + 3);
    const soonStr = format(soonDate, "yyyy-MM-dd");
    const expiringPreventivi = bookings.filter(b => b.status === "preventivo" && b.check_in_date >= selectedDateStr && b.check_in_date <= soonStr);

    const soon4Date = format(addDays(new Date(), 4), "yyyy-MM-dd");
    const missingAppointment = bookings.filter(b => {
      if (b.status !== "confermata") return false;
      if (b.check_in_date < todayStr || b.check_in_date > soon4Date) return false;
      const hasCheckInAppt = (b.appointments ?? []).some((a: any) => a.appointment_type === "check_in");
      return !hasCheckInAppt;
    });

    const activeOutStatuses = ["confermata", "appuntamento_in_fissato", "check_in", "in_corso"];
    const missingCheckOutAppt = bookings.filter(b => {
      if (!activeOutStatuses.includes(b.status)) return false;
      if (b.check_out_date < todayStr || b.check_out_date > soon4Date) return false;
      const hasCheckOutAppt = (b.appointments ?? []).some((a: any) => a.appointment_type === "check_out");
      return !hasCheckOutAppt;
    });

    // Check-in con appuntamento entro i prossimi 30 minuti (solo vista "oggi")
    const imminentCheckIns = isTodayFn(selectedDate) ? bookings.filter(b => {
      if (INACTIVE_STATUSES.includes(b.status)) return false;
      const appt = (b.appointments ?? []).find((a: any) => a.appointment_type === "check_in");
      if (!appt) return false;
      const msUntil = new Date(appt.scheduled_at).getTime() - Date.now();
      return msUntil >= 0 && msUntil <= 30 * 60 * 1000;
    }) : [];

    return {
      catsInStructure, singoleOccupied, doppieOccupied,
      checkInsToday, checkOutsToday, checkInsTomorrow, checkOutsTomorrow,
      toCollect, overduePayments, expiringPreventivi, missingAppointment, missingCheckOutAppt, imminentCheckIns,
    };
  }, [bookings, bookingOccupancy, selectedDate, selectedDateStr, todayStr, tomorrowStr]);

  const numSingole = tenantConfig?.num_singole ?? 0;
  const numDoppie = tenantConfig?.num_doppie ?? 0;
  const maxCats = (tenantConfig as any)?.max_cats ?? 0;
  const totalSlots = numSingole + numDoppie;

  const openTasks = useMemo(() => (tasks ?? []).filter(tk => !tk.completed), [tasks]);
  const unassignedOpenTasks = useMemo(() => openTasks.filter(tk => !tk.assigned_to), [openTasks]);
  const staffNameById = useMemo(() => {
    const map = new Map<string, string>();
    (staffUsers ?? []).forEach((u: any) => map.set(u.user_id, u.full_name || "—"));
    return map;
  }, [staffUsers]);

  const clientName = (b: any) => b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
  const catNames = (b: any) => (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—";
  const accommodationLabel = (b: any) => b.cage_pool_type === "singola" ? t("dashboard.accommodationSingle") : t("dashboard.accommodationDouble");
  const checkInTime = (b: any) => {
    const appt = (b.appointments ?? []).find((a: any) => a.appointment_type === "check_in");
    return appt ? format(new Date(appt.scheduled_at), "HH:mm") : "—";
  };
  const checkOutTime = (b: any) => {
    const appt = (b.appointments ?? []).find((a: any) => a.appointment_type === "check_out");
    return appt ? format(new Date(appt.scheduled_at), "HH:mm") : "—";
  };

  const attentionItems: AttentionItem[] = useMemo(() => {
    if (!stats || isOperatoreRestricted) return [];
    const items: AttentionItem[] = [];
    for (const b of stats.missingAppointment) {
      items.push({
        key: `missing-in-${b.id}`, severity: "red",
        label: t("dashboard.attentionMissingCheckIn"),
        detail: `${clientName(b)} · ${catNames(b)} · ${format(new Date(b.check_in_date + "T00:00:00"), "dd MMM", { locale: dateLocale })}`,
        actionLabel: t("dashboard.scheduleAppt"), onAction: () => setAppointmentBooking(b),
      });
    }
    for (const b of stats.missingCheckOutAppt) {
      items.push({
        key: `missing-out-${b.id}`, severity: "red",
        label: t("dashboard.attentionMissingCheckOut"),
        detail: `${clientName(b)} · ${catNames(b)} · ${format(new Date(b.check_out_date + "T00:00:00"), "dd MMM", { locale: dateLocale })}`,
        actionLabel: t("dashboard.scheduleAppt"), onAction: () => setAppointmentBooking(b),
      });
    }
    if (canSeeMoney) {
      for (const b of stats.overduePayments) {
        items.push({
          key: `overdue-${b.id}`, severity: "red",
          label: t("dashboard.attentionOverduePayment"),
          detail: `${clientName(b)} · € ${calcRemaining(b).toLocaleString("it-IT")}`,
          actionLabel: t("dashboard.open"), onAction: () => navigate("/pagamenti"),
        });
      }
    }
    for (const b of stats.imminentCheckIns) {
      items.push({
        key: `imminent-${b.id}`, severity: "orange",
        label: t("dashboard.attentionImminentCheckIn"),
        detail: `${clientName(b)} · ${catNames(b)} · ${checkInTime(b)}`,
        actionLabel: t("dashboard.open"), onAction: () => navigate("/check-in"),
      });
    }
    for (const b of stats.expiringPreventivi) {
      items.push({
        key: `quote-${b.id}`, severity: "yellow",
        label: t("dashboard.attentionExpiringQuote"),
        detail: `${clientName(b)} · ${catNames(b)}`,
        actionLabel: t("dashboard.open"), onAction: () => navigate("/preventivi"),
      });
    }
    if (canSeeTasks) {
      for (const tk of unassignedOpenTasks) {
        items.push({
          key: `task-${tk.id}`, severity: "yellow",
          label: t("dashboard.attentionUnassignedTask"),
          detail: tk.title,
          actionLabel: t("dashboard.open"), onAction: () => tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        });
      }
    }
    const rank: Record<Severity, number> = { red: 0, orange: 1, yellow: 2 };
    return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [stats, isOperatoreRestricted, canSeeMoney, canSeeTasks, unassignedOpenTasks, dateLocale, t, navigate]);

  if (loadingBookings) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const s = stats ?? {
    catsInStructure: 0, singoleOccupied: 0, doppieOccupied: 0,
    checkInsToday: [] as any[], checkOutsToday: [] as any[], checkInsTomorrow: [] as any[], checkOutsTomorrow: [] as any[],
    toCollect: 0, overduePayments: [] as any[], expiringPreventivi: [] as any[],
    missingAppointment: [] as any[], missingCheckOutAppt: [] as any[], imminentCheckIns: [] as any[],
  };

  const PetIcon = pet.iconName === "Cat" ? Cat : pet.iconName === "Dog" ? Dog : PawPrint;

  const kpis = [
    {
      key: "arrivals", title: t("dashboard.kpiArrivals"), value: String(s.checkInsToday.length),
      subtitle: isSelectedToday ? t("dashboard.expectedToday") : t("dashboard.expectedFor", { date: format(selectedDate, "dd MMM", { locale: dateLocale }) }),
      icon: LogIn, color: "text-success", bg: "bg-success/10", show: true,
      onClick: () => arrivalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      key: "departures", title: t("dashboard.kpiDepartures"), value: String(s.checkOutsToday.length),
      subtitle: isSelectedToday ? t("dashboard.expectedToday") : t("dashboard.expectedFor", { date: format(selectedDate, "dd MMM", { locale: dateLocale }) }),
      icon: LogOut, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", show: true,
      onClick: () => departuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      key: "present", title: t("dashboard.kpiPresent"), value: String(s.catsInStructure),
      subtitle: maxCats > 0 ? t("dashboard.outOf", { total: maxCats }) : t("dashboard.outOfTotal", { total: totalSlots }),
      icon: PetIcon, color: "text-primary", bg: "bg-primary/10", show: true,
      onClick: () => navigate("/presenze"),
    },
    {
      key: "medications", title: t("dashboard.kpiMedications"), value: "0",
      subtitle: t("dashboard.kpiMedicationsSubtitle"),
      icon: Pill, color: "text-accent", bg: "bg-accent/10", show: true,
      onClick: undefined,
    },
    {
      key: "tasks", title: t("dashboard.kpiTasks"), value: String(openTasks.length),
      subtitle: t("dashboard.kpiTasksSubtitle"),
      icon: ClipboardList, color: "text-primary", bg: "bg-primary/10", show: canSeeTasks,
      onClick: () => tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      key: "toCollect", title: t("dashboard.kpiToCollect"), value: `€ ${s.toCollect.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
      subtitle: t("dashboard.kpiToCollectSubtitle"),
      icon: Wallet, color: "text-warning", bg: "bg-warning/10", show: canSeeMoney,
      onClick: () => navigate("/pagamenti"),
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
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSelectedToday ? t("dashboard.todayFocus") : t("dashboard.dataFor", { date: format(selectedDate, "dd MMMM yyyy", { locale: dateLocale }) })} — {tenantConfig?.name ?? "Pensione"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOperatoreRestricted && <AvailabilityCheckDialog />}
          {!isSelectedToday && !isOperatoreRestricted && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              {t("common.today")}
            </Button>
          )}
          {!isOperatoreRestricted && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "dd MMM yyyy", { locale: dateLocale })}
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
      <div className={cn("grid gap-4 sm:grid-cols-2", kpis.length >= 4 ? "lg:grid-cols-3 xl:grid-cols-6" : kpis.length === 3 ? "lg:grid-cols-3" : "")}>
        {kpis.map((stat) => (
          <Card
            key={stat.key}
            className={cn("border shadow-sm", stat.onClick && "cursor-pointer hover:shadow-md transition-shadow")}
            onClick={stat.onClick}
            role={stat.onClick ? "button" : undefined}
          >
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

      {/* Attenzione */}
      {!isOperatoreRestricted && (
        <div ref={attentionRef}>
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t("dashboard.attentionTitle")} {attentionItems.length > 0 && `(${attentionItems.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.attentionEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  {attentionItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", SEVERITY_DOT[item.severity])} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={item.onAction}>
                        {item.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operatore: Show tomorrow's check-in/out */}
      {isOperatoreRestricted && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("common.tomorrow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.checkInsTomorrow.length}</p>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.checkOutsTomorrow.length}</p>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arrivi di oggi */}
      {canSeeCheckIn && (
        <div ref={arrivalsRef}>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {isSelectedToday ? t("dashboard.arrivalsTitle") : t("dashboard.arrivalsTitleFor", { date: format(selectedDate, "dd MMM yyyy", { locale: dateLocale }) })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {s.checkInsToday.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noArrivals")}</p>
              ) : (
                <div className="space-y-2">
                  {s.checkInsToday.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{catNames(b)}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] ?? ""}`}>
                            {t(`statuses.${b.status}`, { defaultValue: b.status })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clientName(b)} · {checkInTime(b)} · {accommodationLabel(b)}
                          {canSeeMoney && ` · ${calcRemaining(b) > 0 ? t("dashboard.unpaid") : t("dashboard.paid")}`}
                        </p>
                        {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5 truncate max-w-md">{b.notes}</p>}
                      </div>
                      <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/check-in")}>
                        {t("dashboard.open")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Partenze di oggi */}
      {canSeeCheckOut && (
        <div ref={departuresRef}>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {isSelectedToday ? t("dashboard.departuresTitle") : t("dashboard.departuresTitleFor", { date: format(selectedDate, "dd MMM yyyy", { locale: dateLocale }) })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {s.checkOutsToday.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noDepartures")}</p>
              ) : (
                <div className="space-y-2">
                  {s.checkOutsToday.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{catNames(b)}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] ?? ""}`}>
                            {t(`statuses.${b.status}`, { defaultValue: b.status })}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clientName(b)} · {checkOutTime(b)} · {accommodationLabel(b)}
                          {canSeeMoney && ` · ${t("dashboard.balance")} € ${calcRemaining(b).toLocaleString("it-IT")}`}
                          {canSeeMoney && calcExtraTotal(b) > 0 && ` · ${t("dashboard.extra")} € ${calcExtraTotal(b).toLocaleString("it-IT")}`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/check-out")}>
                        {t("dashboard.goToCheckOut")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attività di oggi */}
      {canSeeTasks && (
        <div ref={tasksRef}>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {isSelectedToday ? t("dashboard.tasksTitle") : t("dashboard.tasksTitleFor", { date: format(selectedDate, "dd MMM yyyy", { locale: dateLocale }) })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(tasks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.noTasks")}</p>
              ) : (
                <div className="space-y-2">
                  {(tasks ?? []).map((tk) => (
                    <div key={tk.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                      <Checkbox
                        checked={tk.completed}
                        onCheckedChange={(checked) => completeTask.mutate({ id: tk.id, completed: checked === true })}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", tk.completed && "line-through text-muted-foreground")}>{tk.title}</p>
                        {tk.description && <p className="text-xs text-muted-foreground mt-0.5">{tk.description}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tk.assigned_to ? (staffNameById.get(tk.assigned_to) ?? "—") : t("dashboard.unassigned")}
                          {tk.completed && tk.completed_at && ` · ${t("dashboard.completedBy", { name: tk.completed_by ? (staffNameById.get(tk.completed_by) ?? "—") : "—", time: format(new Date(tk.completed_at), "HH:mm") })}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AppointmentScheduleDialog
        open={!!appointmentBooking}
        onOpenChange={(open) => { if (!open) setAppointmentBooking(null); }}
        booking={appointmentBooking}
      />

      {/* Occupazione casette */}
      {!isOperatoreRestricted && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.cageOccupancy")} {!isSelectedToday && `— ${format(selectedDate, "dd MMM yyyy", { locale: dateLocale })}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                 <span className="text-muted-foreground">{t("dashboard.single")}</span>
                <div className="flex items-center gap-1.5">
                  {singoleOverbooking && <AlertCircle className="h-4 w-4 text-[hsl(340,80%,35%)]" />}
                  <span className={cn("font-medium", singoleOverbooking && "text-[hsl(340,80%,35%)]")}>{s.singoleOccupied} / {numSingole}</span>
                </div>
              </div>
              <Progress value={Math.min(singolePct, 100)} className="h-2" indicatorClassName={singoleOverbooking ? "bg-[hsl(340,80%,25%)]" : undefined} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{t("dashboard.double")}</span>
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
    </div>
  );
}
