import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cat, CalendarCheck, LogIn, LogOut, CreditCard, AlertTriangle, CalendarIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useAllPayments } from "@/hooks/usePayments";
import { format, parseISO, startOfMonth, endOfMonth, isToday as isTodayFn } from "date-fns";
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

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isSelectedToday = isTodayFn(selectedDate);
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

  const stats = useMemo(() => {
    if (!bookings) return null;

    // Cats currently in structure (status in_corso)
    const inCorsoBookings = bookings.filter(b => b.status === "in_corso");
    const catsInStructure = inCorsoBookings.reduce((sum, b) => sum + (b.booking_cats?.length ?? 0), 0);

    // Occupancy by cage type: include all accepted bookings overlapping today
    const occupancyStatuses = ["confermata", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato", "check_in", "in_corso"];
    const occupyingBookings = bookings.filter(b =>
      occupancyStatuses.includes(b.status) && b.check_in_date <= today && b.check_out_date >= today
    );
    const singoleOccupied = occupyingBookings.filter(b => b.cage_pool_type === "singola").reduce((s, b) => s + b.units_occupied, 0);
    const doppieOccupied = occupyingBookings.filter(b => b.cage_pool_type === "doppia").reduce((s, b) => s + b.units_occupied, 0);

    // Active bookings (confermata, appuntamento*, in_corso)
    const activeStatuses = ["confermata", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato", "check_in", "in_corso"];
    const activeBookings = bookings.filter(b => activeStatuses.includes(b.status));

    // Check-ins today
    const checkInsToday = bookings.filter(b => b.check_in_date === today && ["check_in", "in_corso"].includes(b.status));

    // Check-outs today
    const checkOutsToday = bookings.filter(b => b.check_out_date === today && ["in_corso", "check_out"].includes(b.status));

    // Monthly revenue
    const monthPayments = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= monthStart && pDate <= monthEnd && p.payment_type !== "rimborso";
    });
    const monthRefunds = (allPayments ?? []).filter(p => {
      const pDate = p.payment_date?.slice(0, 10);
      return pDate >= monthStart && pDate <= monthEnd && p.payment_type === "rimborso";
    });
    const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0) - monthRefunds.reduce((s, p) => s + Number(p.amount), 0);

    // Recent bookings (last 5 updated)
    const recentBookings = [...bookings]
      .filter(b => !["cancellata", "rimborsata"].includes(b.status))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5);

    // Expiring preventivi (preventivo with check_in_date <= today + 3 days)
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 3);
    const soonStr = format(soonDate, "yyyy-MM-dd");
    const expiringPreventivi = bookings.filter(b => b.status === "preventivo" && b.check_in_date <= soonStr);

    return {
      catsInStructure,
      singoleOccupied,
      doppieOccupied,
      activeBookings: activeBookings.length,
      checkInsToday: checkInsToday.length,
      checkOutsToday: checkOutsToday.length,
      monthRevenue,
      recentBookings,
      expiringPreventivi: expiringPreventivi.length,
    };
  }, [bookings, allPayments, today, monthStart, monthEnd]);

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
    monthRevenue: 0, recentBookings: [], expiringPreventivi: 0,
  };

  const kpis = [
    {
      title: "Gatti in struttura",
      value: String(s.catsInStructure),
      subtitle: `su ${totalSlots} posti totali`,
      icon: Cat,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Prenotazioni attive",
      value: String(s.activeBookings),
      subtitle: "confermate o in corso",
      icon: CalendarCheck,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Check-in oggi",
      value: String(s.checkInsToday),
      subtitle: `${s.checkOutsToday} check-out oggi`,
      icon: LogIn,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Incasso mese",
      value: `€ ${s.monthRevenue.toFixed(0)}`,
      subtitle: format(new Date(), "MMMM yyyy", { locale: it }),
      icon: CreditCard,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const singolePct = numSingole > 0 ? Math.round((s.singoleOccupied / numSingole) * 100) : 0;
  const doppiePct = numDoppie > 0 ? Math.round((s.doppieOccupied / numDoppie) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Panoramica operativa — {tenantConfig?.name ?? "Pensione"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Occupancy bar */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Occupazione casette</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Singole</span>
              <span className="font-medium">{s.singoleOccupied} / {numSingole}</span>
            </div>
            <Progress value={singolePct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Doppie</span>
              <span className="font-medium">{s.doppieOccupied} / {numDoppie}</span>
            </div>
            <Progress value={doppiePct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Prenotazioni recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {s.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessuna prenotazione</p>
          ) : (
            <div className="space-y-3">
              {s.recentBookings.map((b: any) => {
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

      {/* Alerts */}
      {s.expiringPreventivi > 0 && (
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
