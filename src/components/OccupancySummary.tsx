import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarArrowDown, CalendarArrowUp, DoorOpen, Percent } from "lucide-react";
import { useOccupancyData, usePoolOccupancyData } from "@/components/OccupancyGrid";
import { InfoTooltip } from "@/components/InfoTooltip";
import type { Booking } from "@/hooks/useBookings";

// Stessa lista di stati "reali" usata altrove (useClientOpportunities,
// useBusinessOverview): esclude preventivi, cancellazioni e rimborsi. Include
// anche le varianti "appuntamento_*_fissato" (prodotte da
// AppointmentScheduleDialog), prima mancanti qui.
const ACTIVE_BOOKING_STATUSES = new Set([
  "confermata", "appuntamento_fissato", "appuntamento_in_fissato",
  "appuntamento_out_fissato", "appuntamento_in_out_fissato",
  "check_in", "in_corso", "check_out", "chiusa",
]);

const PERIODS = [7, 30, 60, 90] as const;
type Period = typeof PERIODS[number];

// Sotto questa soglia una settimana viene segnalata come "bassa occupazione",
// per suggerire al titolare dove concentrare marketing/promozioni.
const LOW_OCCUPANCY_THRESHOLD = 40;

interface Props {
  bookings: Booking[];
  occupancyDays: number;
  totalSingole: number;
  totalDoppie: number;
  petType?: "gatti" | "cani" | "entrambi";
}

export function OccupancySummary({ bookings, occupancyDays, totalSingole, totalDoppie, petType }: Props) {
  const [period, setPeriod] = useState<Period>(30);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const rangeEnd = useMemo(() => addDays(today, period - 1), [today, period]);

  // Stessa logica di selezione occupazione generica/per-pool già usata da
  // OccupancyGrid, per restare coerenti con il calcolo mostrato lì.
  const isPoolView = petType === "gatti" || petType === "cani";
  const { bookingOccupancy: genericOccupancy } = useOccupancyData(bookings, occupancyDays, undefined, petType);
  const { bookingOccupancy: poolOccupancy } = usePoolOccupancyData(bookings, occupancyDays, petType as "gatti" | "cani");
  const bookingOccupancy = isPoolView ? poolOccupancy : genericOccupancy;

  const totalCapacity = totalSingole + totalDoppie;
  const days = useMemo(() => eachDayOfInterval({ start: today, end: rangeEnd }), [today, rangeEnd]);

  const dailyOccupied = useMemo(() => {
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      let occupied = 0;
      for (const bo of bookingOccupancy) {
        if (bo.occupiedDates.has(dateStr)) occupied += bo.booking.units_occupied ?? 1;
      }
      return { date: day, dateStr, occupied };
    });
  }, [days, bookingOccupancy]);

  const avgOccupancyPct = totalCapacity > 0
    ? (dailyOccupied.reduce((s, d) => s + d.occupied, 0) / (totalCapacity * days.length)) * 100
    : 0;
  const avgFreeSlots = totalCapacity > 0
    ? totalCapacity - dailyOccupied.reduce((s, d) => s + d.occupied, 0) / days.length
    : 0;

  const todayStr = format(today, "yyyy-MM-dd");
  const rangeEndStr = format(rangeEnd, "yyyy-MM-dd");
  const arrivals = bookings.filter(
    (b) => ACTIVE_BOOKING_STATUSES.has(b.status) && b.check_in_date >= todayStr && b.check_in_date <= rangeEndStr
  ).length;
  const departures = bookings.filter(
    (b) => ACTIVE_BOOKING_STATUSES.has(b.status) && b.check_out_date >= todayStr && b.check_out_date <= rangeEndStr
  ).length;

  // Segmenta il periodo in settimane per individuare quelle a bassa occupazione.
  const lowWeeks = useMemo(() => {
    if (totalCapacity === 0) return [];
    const weeks: { start: Date; end: Date; pct: number }[] = [];
    for (let i = 0; i < dailyOccupied.length; i += 7) {
      const chunk = dailyOccupied.slice(i, i + 7);
      if (chunk.length === 0) continue;
      const pct = (chunk.reduce((s, d) => s + d.occupied, 0) / (totalCapacity * chunk.length)) * 100;
      weeks.push({ start: chunk[0].date, end: chunk[chunk.length - 1].date, pct });
    }
    return weeks.filter((w) => w.pct < LOW_OCCUPANCY_THRESHOLD);
  }, [dailyOccupied, totalCapacity]);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Occupazione futura</h3>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
                {p}gg
              </Button>
            ))}
          </div>
        </div>

        {totalCapacity === 0 ? (
          <p className="text-xs text-muted-foreground">Configura il numero di casette in Impostazioni Pensione per vedere questi dati.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile
                icon={Percent} label="Occupazione media" value={`${avgOccupancyPct.toFixed(0)}%`}
                description="Percentuale media di posti occupati nel periodo selezionato, calcolata su tutti i giorni rispetto alla capacità totale configurata."
              />
              <SummaryTile
                icon={DoorOpen} label="Posti liberi (media/gg)" value={avgFreeSlots.toFixed(1)}
                description="Numero medio di posti liberi al giorno nel periodo selezionato (capacità totale meno occupazione media)."
              />
              <SummaryTile
                icon={CalendarArrowDown} label="Arrivi previsti" value={arrivals.toString()}
                description="Numero di soggiorni con check-in previsto all'interno del periodo selezionato."
              />
              <SummaryTile
                icon={CalendarArrowUp} label="Partenze previste" value={departures.toString()}
                description="Numero di soggiorni con check-out previsto all'interno del periodo selezionato."
              />
            </div>

            {lowWeeks.length > 0 && (
              <div className="rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Periodi a bassa occupazione — valuta una promozione
                  <InfoTooltip text={`Settimane del periodo selezionato con occupazione media sotto il ${LOW_OCCUPANCY_THRESHOLD}%: possono essere un buon momento per una promozione o una campagna marketing.`} />
                </div>
                {lowWeeks.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    {format(w.start, "d MMM", { locale: it })} → {format(w.end, "d MMM", { locale: it })}: {w.pct.toFixed(0)}% di occupazione media
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  icon: Icon, label, value, description,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-border/50 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px]">{label}</span>
        <InfoTooltip text={description} />
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
