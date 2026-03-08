import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cat, CalendarCheck, LogIn, LogOut, CreditCard, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBookings } from "@/hooks/useBookings";
import { usePreventivi } from "@/hooks/usePreventivi";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export default function Index() {
  const { profile } = useAuth();
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: preventivi, isLoading: loadingPreventivi } = usePreventivi();
  const { data: tenantConfig } = useTenantConfig();

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  // Fetch payments for the current month
  const { data: monthPayments } = useQuery({
    queryKey: ["dashboard-payments", profile?.tenant_id, monthStart, monthEnd],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("amount, payment_type, payment_date")
        .eq("tenant_id", profile.tenant_id)
        .gte("payment_date", `${monthStart}T00:00:00`)
        .lte("payment_date", `${monthEnd}T23:59:59`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch today's planning tasks
  const { data: todayTasks } = useQuery({
    queryKey: ["dashboard-tasks", profile?.tenant_id, today],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("planning_tasks")
        .select("id, title, description, completed, assigned_to")
        .eq("tenant_id", profile.tenant_id)
        .eq("task_date", today)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
  });

  const stats = useMemo(() => {
    if (!bookings) return null;

    // Stati che occupano casette (in_corso + confermata/appuntamento con date che coprono oggi)
    const occupyingStatuses = [
      "confermata",
      "appuntamento_in_fissato",
      "appuntamento_out_fissato",
      "appuntamento_in_out_fissato",
      "check_in",
      "in_corso",
      "check_out",
    ];
    const occupyingBookings = bookings.filter(b =>
      occupyingStatuses.includes(b.status) &&
      b.check_in_date <= today &&
      b.check_out_date >= today
    );

    // Gatti in struttura: solo bookings "in_corso"
    const inCorso = bookings.filter(b => b.status === "in_corso");
    const catsInStructure = inCorso.reduce(
      (sum, b) => sum + (b.booking_cats?.length ?? 0), 0
    );

    // Occupazione casette (tutte le prenotazioni attive che coprono oggi)
    const singoleOccupate = occupyingBookings
      .filter(b => b.cage_pool_type === "singola")
      .reduce((sum, b) => sum + b.units_occupied, 0);
    const doppieOccupate = occupyingBookings
      .filter(b => b.cage_pool_type === "doppia")
      .reduce((sum, b) => sum + b.units_occupied, 0);

    const numSingole = tenantConfig?.num_singole ?? 0;
    const numDoppie = tenantConfig?.num_doppie ?? 0;
    const totalPosti = numSingole + numDoppie;

    // Prenotazioni attive (non chiusa/cancellata/rimborsata/scaduto)
    const closedStatuses = ["chiusa", "cancellata", "rimborsata", "scaduto"];
    const activeBookings = bookings.filter(b => !closedStatuses.includes(b.status));

    // Check-in oggi
    const checkinToday = bookings.filter(b =>
      ["appuntamento_in_fissato", "appuntamento_in_out_fissato", "check_in"].includes(b.status) &&
      b.check_in_date === today
    );

    // Check-out oggi
    const checkoutToday = bookings.filter(b =>
      b.status === "in_corso" && b.check_out_date === today
    );

    // Incasso mese
    const monthIncome = (monthPayments ?? [])
      .reduce((sum, p) => {
        if (p.payment_type === "rimborso") return sum - Number(p.amount);
        return sum + Number(p.amount);
      }, 0);

    return {
      catsInStructure,
      totalPosti,
      singoleOccupate,
      doppieOccupate,
      numSingole,
      numDoppie,
      activeBookings: activeBookings.length,
      checkinToday: checkinToday.length,
      checkoutToday: checkoutToday.length,
      monthIncome,
    };
  }, [bookings, tenantConfig, monthPayments, today]);

  // Prenotazioni recenti (ultime 5 per data creazione)
  const recentBookings = useMemo(() => {
    const all = [...(bookings ?? []), ...(preventivi ?? [])];
    return all
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
  }, [bookings, preventivi]);

  // Alerts
  const alerts = useMemo(() => {
    const msgs: string[] = [];
    // Preventivi scaduti o in scadenza
    const prevInScadenza = (preventivi ?? []).filter(
      p => p.status === "preventivo" && p.check_in_date <= today
    );
    if (prevInScadenza.length > 0) {
      msgs.push(`${prevInScadenza.length} preventiv${prevInScadenza.length === 1 ? "o" : "i"} in scadenza`);
    }
    // Bookings con saldo in sospeso in check-out oggi
    const coToday = (bookings ?? []).filter(
      b => b.status === "in_corso" && b.check_out_date === today
    );
    if (coToday.length > 0) {
      msgs.push(`${coToday.length} check-out previst${coToday.length === 1 ? "o" : "i"} oggi`);
    }
    return msgs;
  }, [preventivi, bookings, today]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    preventivo: { label: "Preventivo", color: "bg-warning/15 text-warning" },
    confermata: { label: "Confermata", color: "bg-primary/15 text-primary" },
    appuntamento_in_fissato: { label: "App. IN", color: "bg-accent/15 text-accent" },
    appuntamento_out_fissato: { label: "App. OUT", color: "bg-accent/15 text-accent" },
    appuntamento_in_out_fissato: { label: "App. IN/OUT", color: "bg-accent/15 text-accent" },
    check_in: { label: "Check-in", color: "bg-success/15 text-success" },
    in_corso: { label: "In corso", color: "bg-success/15 text-success" },
    check_out: { label: "Check-out", color: "bg-destructive/15 text-destructive" },
    chiusa: { label: "Chiusa", color: "bg-muted text-muted-foreground" },
    cancellata: { label: "Cancellata", color: "bg-destructive/15 text-destructive" },
    rimborsata: { label: "Rimborsata", color: "bg-muted text-muted-foreground" },
    scaduto: { label: "Scaduto", color: "bg-muted text-muted-foreground" },
  };

  const isLoading = loadingBookings || loadingPreventivi;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Panoramica operativa{tenantConfig?.name ? ` — ${tenantConfig.name}` : ""}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gatti in struttura</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cat className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">{isLoading ? "—" : stats?.catsInStructure ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              su {stats?.totalPosti ?? 0} posti totali
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prenotazioni attive</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">{isLoading ? "—" : stats?.activeBookings ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.checkinToday ? `${stats.checkinToday} check-in oggi` : "Nessun check-in oggi"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-in / Check-out oggi</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
              <LogIn className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">
              {isLoading ? "—" : `${stats?.checkinToday ?? 0} / ${stats?.checkoutToday ?? 0}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              arrivi / partenze
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Incasso mese</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">
              {isLoading ? "—" : `€ ${(stats?.monthIncome ?? 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "MMMM yyyy", { locale: it })}
            </p>
          </CardContent>
        </Card>
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
              <span className="font-medium">{stats?.singoleOccupate ?? 0} / {stats?.numSingole ?? 0}</span>
            </div>
            <Progress
              value={stats?.numSingole ? ((stats.singoleOccupate / stats.numSingole) * 100) : 0}
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Doppie</span>
              <span className="font-medium">{stats?.doppieOccupate ?? 0} / {stats?.numDoppie ?? 0}</span>
            </div>
            <Progress
              value={stats?.numDoppie ? ((stats.doppieOccupate / stats.numDoppie) * 100) : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Prenotazioni recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna prenotazione recente.</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => {
                  const clientName = b.client
                    ? `${b.client.first_name} ${b.client.last_name}`
                    : "—";
                  const catNames = (b.booking_cats ?? [])
                    .map((bc: any) => bc.cat?.name)
                    .filter(Boolean)
                    .join(", ");
                  const sc = statusConfig[b.status] ?? { label: b.status, color: "bg-muted text-muted-foreground" };

                  return (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{clientName}</p>
                        <p className="text-xs text-muted-foreground">{catNames || "—"}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today Tasks */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Compiti di oggi</CardTitle>
          </CardHeader>
          <CardContent>
            {!todayTasks?.length ? (
              <p className="text-sm text-muted-foreground">Nessun compito per oggi.</p>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        t.completed
                          ? "bg-success border-success text-success-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {t.completed && <span className="text-[10px]">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-none shadow-sm border-l-4 border-l-warning">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">Attenzione</p>
              <p className="text-xs text-muted-foreground">{alerts.join(" · ")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
