import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessOverview } from "@/components/statistiche/BusinessOverview";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Users, PawPrint, Euro, FileText, CalendarCheck, BarChart3, FileDown, CalendarIcon } from "lucide-react";
import { format, subYears, startOfYear, parseISO, differenceInDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { generateStatisticsPDF } from "@/lib/generateStatisticsPDF";

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
  const supabase = useSupabase();
  const { profile } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>("tutti");
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const { data: tenantConfig } = useTenantConfig();

  const [reportPeriodMode, setReportPeriodMode] = useState<"tutto" | "range">("tutto");
  const [reportRangeFrom, setReportRangeFrom] = useState<Date>();
  const [reportRangeTo, setReportRangeTo] = useState<Date>();
  const [reportClientFilter, setReportClientFilter] = useState<string>("tutti");
  const [reportPetTypeFilter, setReportPetTypeFilter] = useState<string>("tutti");
  const [exportingPDF, setExportingPDF] = useState(false);

  const threeYearsAgo = subYears(startOfYear(new Date()), 2).toISOString();

  // Fetch all bookings from last 3 years
  const { data: allBookings = [] } = useQuery({
    queryKey: ["stats-bookings", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, check_in_date, check_out_date, total_amount, deposit_amount, cage_pool_type, units_occupied, pet_type, created_at, client_id, client:clients(first_name, last_name), booking_cats(cat_id)")
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
        .select("id, booking_id, amount, payment_date, payment_type")
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

  // ══════════════════════════════════════════════
  // Report Statistiche (export PDF con filtri indipendenti dalle tab sopra)
  // ══════════════════════════════════════════════
  const isEntrambiPet = tenantConfig?.pet_type === "entrambi";

  const hasActiveReportFilter = reportPeriodMode !== "tutto" || reportClientFilter !== "tutti" || reportPetTypeFilter !== "tutti";

  const allReportClients = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of allBookings as any[]) {
      if (b.client_id && !map.has(b.client_id)) {
        map.set(b.client_id, b.client ? `${b.client.last_name} ${b.client.first_name}` : "—");
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allBookings]);

  const reportBookings = useMemo(() => {
    if (!hasActiveReportFilter) return [];
    let list: any[] = allBookings;
    if (reportClientFilter !== "tutti") list = list.filter((b) => b.client_id === reportClientFilter);
    if (reportPetTypeFilter !== "tutti") {
      list = list.filter((b) => b.pet_type === reportPetTypeFilter || b.pet_type === "entrambi");
    }
    if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
      const interval = { start: startOfDay(reportRangeFrom), end: endOfDay(reportRangeTo) };
      list = list.filter((b) => isWithinInterval(parseISO(b.created_at), interval));
    }
    return list;
  }, [allBookings, hasActiveReportFilter, reportClientFilter, reportPetTypeFilter, reportPeriodMode, reportRangeFrom, reportRangeTo]);

  const reportPayments = useMemo(() => {
    if (!hasActiveReportFilter) return [];
    let list: any[] = allPayments;
    if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
      const interval = { start: startOfDay(reportRangeFrom), end: endOfDay(reportRangeTo) };
      list = list.filter((p) => isWithinInterval(parseISO(p.payment_date), interval));
    }
    if (reportClientFilter !== "tutti" || reportPetTypeFilter !== "tutti") {
      const allowedIds = new Set(
        (allBookings as any[]).filter((b) =>
          (reportClientFilter === "tutti" || b.client_id === reportClientFilter) &&
          (reportPetTypeFilter === "tutti" || b.pet_type === reportPetTypeFilter || b.pet_type === "entrambi")
        ).map((b) => b.id)
      );
      list = list.filter((p) => allowedIds.has(p.booking_id));
    }
    return list;
  }, [allBookings, allPayments, hasActiveReportFilter, reportClientFilter, reportPetTypeFilter, reportPeriodMode, reportRangeFrom, reportRangeTo]);

  const reportKpis = useMemo(() => {
    const totPreventivi = reportBookings.length;
    const totConfermati = reportBookings.filter((b) => !["preventivo", "scaduto", "cancellata", "rimborsata"].includes(b.status)).length;
    const totCancellati = reportBookings.filter((b) => ["cancellata", "rimborsata"].includes(b.status)).length;
    const totChiuse = reportBookings.filter((b) => b.status === "chiusa").length;
    const conversionRate = totPreventivi > 0 ? ((totConfermati / totPreventivi) * 100).toFixed(1) : "0";
    const cancellationRate = totPreventivi > 0 ? ((totCancellati / totPreventivi) * 100).toFixed(1) : "0";
    const totalRevenue = reportPayments.filter((p) => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunds = reportPayments.filter((p) => p.payment_type === "rimborso").reduce((s, p) => s + Number(p.amount), 0);
    const netRevenue = totalRevenue - totalRefunds;
    const uniquePets = new Set(reportBookings.flatMap((b) => (b.booking_cats || []).map((bc: any) => bc.cat_id))).size;
    const totalPetStays = reportBookings.flatMap((b) => b.booking_cats || []).length;
    const completedBookings = reportBookings.filter((b) => ["chiusa", "in_corso", "check_out"].includes(b.status));
    const avgStayDays = completedBookings.length > 0
      ? (completedBookings.reduce((s, b) => s + Math.max(1, differenceInDays(parseISO(b.check_out_date), parseISO(b.check_in_date))), 0) / completedBookings.length).toFixed(1)
      : "0";
    return { totPreventivi, totConfermati, totCancellati, totChiuse, conversionRate, cancellationRate, netRevenue, totalRefunds, uniquePets, totalPetStays, avgStayDays };
  }, [reportBookings, reportPayments]);

  const reportMonthlyData = useMemo(() => {
    if (!hasActiveReportFilter) return [];
    const buckets = new Map<string, { year: number; month: number; label: string }>();
    const addBucket = (d: Date) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets.has(key)) buckets.set(key, { year: d.getFullYear(), month: d.getMonth(), label: `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}` });
    };
    reportBookings.forEach((b) => addBucket(new Date(b.created_at)));
    reportPayments.forEach((p) => addBucket(new Date(p.payment_date)));

    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return ay !== by ? ay - by : am - bm;
    });

    return sortedKeys.map((key) => {
      const { year, month, label } = buckets.get(key)!;
      const monthBookings = reportBookings.filter((b) => {
        const d = new Date(b.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const monthPayments = reportPayments.filter((p) => {
        const d = new Date(p.payment_date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const preventivi = monthBookings.length;
      const confermati = monthBookings.filter((b) => !["preventivo", "scaduto", "cancellata", "rimborsata"].includes(b.status)).length;
      const revenue = monthPayments.filter((p) => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
      const petCount = monthBookings.flatMap((b) => b.booking_cats || []).length;
      return {
        label,
        preventivi,
        confermati,
        cancellati: monthBookings.filter((b) => ["cancellata", "rimborsata"].includes(b.status)).length,
        revenue,
        petCount,
        conversionRate: preventivi > 0 ? Math.round((confermati / preventivi) * 100) : 0,
      };
    });
  }, [reportBookings, reportPayments, hasActiveReportFilter]);

  const reportStatusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    reportBookings.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count }));
  }, [reportBookings]);

  const reportCageDistribution = useMemo(() => {
    const singole = reportBookings.filter((b) => b.cage_pool_type === "singola").length;
    const doppie = reportBookings.filter((b) => b.cage_pool_type === "doppia").length;
    return [
      { name: "Singole", value: singole },
      { name: "Doppie", value: doppie },
    ].filter((d) => d.value > 0);
  }, [reportBookings]);

  const handleExportStatisticsPDF = async () => {
    if (!tenantConfig || !hasActiveReportFilter) return;
    setExportingPDF(true);
    try {
      const summaryParts: string[] = [];
      if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
        summaryParts.push(`Periodo: ${format(reportRangeFrom, "dd/MM/yyyy")} - ${format(reportRangeTo, "dd/MM/yyyy")}`);
      }
      const selectedClient = reportClientFilter !== "tutti" ? allReportClients.find((c) => c.id === reportClientFilter) : undefined;
      if (selectedClient) summaryParts.push(`Cliente: ${selectedClient.name}`);
      if (reportPetTypeFilter !== "tutti") {
        summaryParts.push(`Pet: ${reportPetTypeFilter === "cani" ? "Cani" : "Gatti"}`);
      }

      const slug = (s: string) => s
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const fileNameParts = ["Report_Statistiche"];
      if (selectedClient) fileNameParts.push(slug(selectedClient.name));
      if (reportPetTypeFilter !== "tutti") fileNameParts.push(slug(reportPetTypeFilter));
      if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
        fileNameParts.push(format(reportRangeFrom, "yyyy-MM-dd"), format(reportRangeTo, "yyyy-MM-dd"));
      } else {
        fileNameParts.push(format(new Date(), "yyyy-MM-dd"));
      }

      await generateStatisticsPDF(
        {
          kpis: reportKpis,
          monthlyData: reportMonthlyData,
          statusDistribution: reportStatusDistribution,
          cageDistribution: reportCageDistribution,
        },
        tenantConfig as any,
        summaryParts.join(" · ") || null,
        `${fileNameParts.join("_")}.pdf`,
      );
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    } finally {
      setExportingPDF(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Statistiche
        </h1>
        <p className="text-sm text-muted-foreground">Fatturato, occupazione e andamento dei soggiorni, oggi e nel tempo</p>
      </div>

      {/* Report Statistiche */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold">Report Statistiche</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportStatisticsPDF}
            disabled={exportingPDF || !hasActiveReportFilter || !tenantConfig}
          >
            <FileDown className="mr-2 h-4 w-4" /> Esporta PDF
          </Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={reportClientFilter} onValueChange={setReportClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i clienti</SelectItem>
              {allReportClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEntrambiPet && (
            <Select value={reportPetTypeFilter} onValueChange={setReportPetTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i pet</SelectItem>
                <SelectItem value="gatti">Gatti</SelectItem>
                <SelectItem value="cani">Cani</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={reportPeriodMode} onValueChange={(v) => setReportPeriodMode(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutto">Tutto il periodo</SelectItem>
              <SelectItem value="range">Intervallo date</SelectItem>
            </SelectContent>
          </Select>
          {reportPeriodMode === "range" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reportRangeFrom ? format(reportRangeFrom, "dd MMM yyyy", { locale: it }) : "Dal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar mode="single" selected={reportRangeFrom} onSelect={setReportRangeFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reportRangeTo ? format(reportRangeTo, "dd MMM yyyy", { locale: it }) : "Al"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar mode="single" selected={reportRangeTo} onSelect={setReportRangeTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        {!hasActiveReportFilter ? (
          <p className="text-xs text-muted-foreground">Seleziona almeno un filtro per calcolare il report</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {reportKpis.totPreventivi} prenotazioni corrispondenti ai filtri · Ricavi netti € {reportKpis.netRevenue.toFixed(2)}
          </p>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Panoramica business</TabsTrigger>
          <TabsTrigger value="trend">Andamento storico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BusinessOverview />
        </TabsContent>

        <TabsContent value="trend" className="mt-4 space-y-6">
      <div className="flex justify-end">
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
        <KpiCard icon={FileText} label="Totale Preventivi" value={totPreventivi} />
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
        </TabsContent>
      </Tabs>
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
