import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cat, CalendarCheck, LogIn, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    title: "Gatti in struttura",
    value: "12",
    subtitle: "su 18 posti totali",
    icon: Cat,
    trend: "+2 oggi",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Prenotazioni attive",
    value: "8",
    subtitle: "3 in arrivo questa settimana",
    icon: CalendarCheck,
    trend: "+15%",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    title: "Check-in oggi",
    value: "3",
    subtitle: "Slot: 10:00, 11:00, 14:30",
    icon: LogIn,
    trend: "2 confermati",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    title: "Incasso mese",
    value: "€4.280",
    subtitle: "Target: €6.000",
    icon: CreditCard,
    trend: "+22% vs mese scorso",
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const recentBookings = [
  { client: "Maria Rossi", cats: "Luna", status: "Check-in oggi", statusColor: "bg-success/15 text-success" },
  { client: "Luca Bianchi", cats: "Micio, Felix", status: "Confermata", statusColor: "bg-primary/15 text-primary" },
  { client: "Anna Verdi", cats: "Pallino", status: "In corso", statusColor: "bg-accent/15 text-accent" },
  { client: "Marco Neri", cats: "Whiskers", status: "Preventivo", statusColor: "bg-warning/15 text-warning" },
];

const todayTasks = [
  { task: "Pulizia gabbie zona A", assignee: "Sara", done: true },
  { task: "Somministrazione farmaci — Luna", assignee: "Marco", done: false },
  { task: "Foto aggiornamento — Micio, Felix", assignee: "Sara", done: false },
  { task: "Pappa serale", assignee: "Tutti", done: false },
];

export default function Index() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Panoramica operativa — Pensione Milano
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
              <div className="text-2xl font-bold font-serif">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-xs text-success font-medium">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy bar */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Occupazione gabbie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Singole</span>
              <span className="font-medium">8 / 12</span>
            </div>
            <Progress value={67} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Doppie</span>
              <span className="font-medium">4 / 6</span>
            </div>
            <Progress value={67} className="h-2" />
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
            <div className="space-y-3">
              {recentBookings.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{b.client}</p>
                    <p className="text-xs text-muted-foreground">{b.cats}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.statusColor}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today Tasks */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Compiti di oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTasks.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      t.done
                        ? "bg-success border-success text-success-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {t.done && <span className="text-[10px]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.done ? "line-through text-muted-foreground" : "font-medium"}`}>
                      {t.task}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.assignee}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-none shadow-sm border-l-4 border-l-warning">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium">Attenzione</p>
            <p className="text-xs text-muted-foreground">
              2 preventivi in scadenza oggi · 1 pagamento caparra in attesa
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
