import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, PawPrint, Euro, FileText, CalendarCheck, BarChart3 } from "lucide-react";
import { format, subYears, startOfYear, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

const MONTHS_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivi",
  confermata: "Confermate",
  in_corso: "In corso",
  chiusa: "Chiuse",
  cancellata: "Cancellate",
  rimborsata: "Rimborsate",
  scaduto: "Scadute",
};

export default function Statistiche() {
  const { profile } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>("tutti");
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const threeYearsAgo = subYears(startOfYear(new Date()), 2).toISOString();

  // Fetch all bookings from last 3 years
  const { data: allBookings = [] } = useQuery({
    queryKey: ["stats-bookings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, check_in_date, check_out_date, total_amount, deposit_amount, cage_pool_type, units_occupied, pet_type, created_at, booking_cats(cat_id)")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", threeYearsAgo)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch payments
  const { data: allPayments = [] } = useQuery({
    queryKey: ["stats-payments", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_type")
        .eq("tenant_id", profile.tenant_id)
        .gte("payment_date", threeYearsAgo);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Filter by year
  const bookings = useMemo(() => {
    if (selectedYear === "tutti") return allBookings;
    return allBookings.filter((b) => new Date(b.created_at).getFullYear() === parseInt(selectedYear));
  }, [allBookings, selectedYear]);

  const payments = useMemo(() => {
    if (selectedYear === "tutti") return allPayments;
    return allPayments.filter((p) => new Date(p.payment_date).getFullYear() === parseInt(selectedYear));
  }, [allPayments, selectedYear]);

  // KPIs
  const totPreventivi = bookings.filter((b) => b.status === "preventivo" || b.status === "scaduto").length + bookings.filter((b) => b.status !== "preventivo" && b.status !== "scaduto").length;
  const totConfermati = bookings.filter((b) => !["preventivo", "scaduto", "cancellata", "rimborsata"].includes(b.status)).length;
  const totCancellati = bookings.filter((b) => ["cancellata", "rimborsata"].includes(b.status)).length;
  const totChiuse = bookings.filter((b) => b.status === "chiusa").length;
  const conversionRate = totPreventivi > 0 ? ((totConfermati / totPreventivi) * 100).toFixed(1) : "0";
  const cancellationRate = totPreventivi > 0 ? ((totCancellati / totPreventivi) * 100).toFixed(1) : "0";

  const totalRevenue = payments.filter((p) => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
  const totalRefunds = payments.filter((p) => p.payment_type === "rimborso").reduce((s, p) => s + Number(p.amount), 0);
  const netRevenue = totalRevenue - totalRefunds;

  // Count unique pets
  const uniquePets = new Set(bookings.flatMap((b) => (b.booking_cats || []).map((bc: any) => bc.cat_id)));
  const totalPetStays = bookings.flatMap((b) => b.booking_cats || []).length;

  // Average stay duration
  const completedBookings = bookings.filter((b) => ["chiusa", "in_corso", "check_out"].includes(b.status));
  const avgStayDays = completedBookings.length > 0
    ? (completedBookings.reduce((s, b) => s + Math.max(1, differenceInDays(parseISO(b.check_out_date), parseISO(b.check_in_date))), 0) / completedBookings.length).toFixed(1)
    : "0";

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const filterYears = selectedYear === "tutti" ? years : [parseInt(selectedYear)];
    return filterYears.flatMap((year) =>
      MONTHS_IT.map((month, i) => {
        const monthBookings = allBookings.filter((b) => {
          const d = new Date(b.created_at);
          return d.getFullYear() === year && d.getMonth() === i;
        });
        const monthPayments = allPayments.filter((p) => {
          const d = new Date(p.payment_date);
          return d.getFullYear() === year && d.getMonth() === i;
        });
        const preventivi = monthBookings.length;
        const confermati = monthBookings.filter((b) => !["preventivo", "scaduto", "cancellata", "rimborsata"].includes(b.status)).length;
        const revenue = monthPayments.filter((p) => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
        const petCount = monthBookings.flatMap((b) => b.booking_cats || []).length;

        return {
          label: selectedYear === "tutti" ? `${month} ${year}` : month,
          year,
          month: i,
          preventivi,
          confermati,
          cancellati: monthBookings.filter((b) => ["cancellata", "rimborsata"].includes(b.status)).length,
          revenue,
          petCount,
          conversionRate: preventivi > 0 ? Math.round((confermati / preventivi) * 100) : 0,
        };
      })
    );
  }, [allBookings, allPayments, selectedYear, years]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
    }));
  }, [bookings]);

  // Cage type distribution
  const cageDistribution = useMemo(() => {
    const singole = bookings.filter((b) => b.cage_pool_type === "singola").length;
    const doppie = bookings.filter((b) => b.cage_pool_type === "doppia").length;
    return [
      { name: "Singole", value: singole },
      { name: "Doppie", value: doppie },
    ].filter((d) => d.value > 0);
  }, [bookings]);

  // Yearly comparison
  const yearlyComparison = useMemo(() => {
    return years.map((year) => {
      const yBookings = allBookings.filter((b) => new Date(b.created_at).getFullYear() === year);
      const yPayments = allPayments.filter((p) => new Date(p.payment_date).getFullYear() === year);
      return {
        year: year.toString(),
        preventivi: yBookings.length,
        confermati: yBookings.filter((b) => !["preventivo", "scaduto", "cancellata", "rimborsata"].includes(b.status)).length,
        ricavi: yPayments.filter((p) => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0),
        pets: yBookings.flatMap((b) => b.booking_cats || []).length,
      };
    }).reverse();
  }, [allBookings, allPayments, years]);

  const chartConfig = {
    preventivi: { label: "Preventivi", color: CHART_COLORS[0] },
    confermati: { label: "Confermati", color: CHART_COLORS[2] },
    cancellati: { label: "Cancellati", color: CHART_COLORS[4] },
    revenue: { label: "Ricavi (€)", color: CHART_COLORS[3] },
    petCount: { label: "Pet ospitati", color: CHART_COLORS[5] },
    conversionRate: { label: "Conversione %", color: CHART_COLORS[0] },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Statistiche
          </h1>
          <p className="text-sm text-muted-foreground">Analisi conversioni, ricavi e soggiorni</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Ultimi 3 anni</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard icon={FileText} label="Totale Pratiche" value={totPreventivi} />
        <KpiCard icon={CalendarCheck} label="Confermati" value={totConfermati} color="text-green-600" />
        <KpiCard icon={TrendingUp} label="Tasso Conversione" value={`${conversionRate}%`} color="text-blue-600" />
        <KpiCard icon={TrendingDown} label="Tasso Cancellazione" value={`${cancellationRate}%`} color="text-red-500" />
        <KpiCard icon={Euro} label="Ricavi Netti" value={`€${netRevenue.toLocaleString("it-IT", { minimumFractionDigits: 0 })}`} color="text-amber-600" />
        <KpiCard icon={PawPrint} label="Pet Soggiornati" value={totalPetStays} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pet unici</p>
            <p className="text-xl font-bold text-foreground">{uniquePets.size}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Soggiorni chiusi</p>
            <p className="text-xl font-bold text-foreground">{totChiuse}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Durata media (gg)</p>
            <p className="text-xl font-bold text-foreground">{avgStayDays}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Rimborsi totali</p>
            <p className="text-xl font-bold text-red-500">€{totalRefunds.toLocaleString("it-IT", { minimumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Comparison */}
      {selectedYear === "tutti" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confronto Annuale</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={yearlyComparison}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="year" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="preventivi" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="confermati" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pets" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Preventivi vs Confermati (mensile)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="preventivi" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="confermati" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancellati" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ricavi Mensili (€)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[3]} strokeWidth={2} dot={{ fill: CHART_COLORS[3], r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pet stays monthly */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pet Ospitati (mensile)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="petCount" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Conversion Rate Trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tasso di Conversione % (mensile)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="conversionRate" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ fill: CHART_COLORS[0], r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuzione per Stato</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[280px] w-full">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tipo Casetta Richiesta</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[280px] w-full">
              <PieChart>
                <Pie data={cageDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {cageDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <p className={`text-xl font-bold ${color || "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
