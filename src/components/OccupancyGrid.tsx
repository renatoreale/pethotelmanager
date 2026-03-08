import { useMemo } from "react";
import { format, addDays, eachDayOfInterval, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Booking } from "@/hooks/useBookings";

interface BookingOccupancy {
  booking: Booking;
  occupiedDates: Set<string>;
  stayStart: string;
  stayEnd: string;
}

interface Props {
  bookings: Booking[];
  occupancyDays: number;
  totalSingole: number;
  totalDoppie: number;
  rangeStart: Date;
  rangeEnd: Date;
  /** Booking ID to exclude from occupancy (e.g. current editing booking) */
  excludeBookingId?: string;
  compact?: boolean;
}

const ACTIVE_STATUSES = [
  "confermata", "appuntamento_fissato", "appuntamento_in_fissato",
  "appuntamento_out_fissato", "appuntamento_in_out_fissato",
  "check_in", "in_corso", "check_out", "chiusa",
];

export function useOccupancyData(
  bookings: Booking[],
  occupancyDays: number,
  excludeBookingId?: string,
) {
  const relevantBookings = useMemo(() => {
    return bookings
      .filter(b => ACTIVE_STATUSES.includes(b.status))
      .filter(b => !excludeBookingId || b.id !== excludeBookingId);
  }, [bookings, excludeBookingId]);

  const bookingOccupancy = useMemo(() => {
    return relevantBookings.map(b => {
      const checkIn = parseISO(b.check_in_date);
      const checkOut = parseISO(b.check_out_date);
      const stayDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const occDays = Math.min(occupancyDays, stayDays);
      const occupiedDates = new Set<string>();
      for (let i = 0; i < occDays; i++) {
        occupiedDates.add(format(addDays(checkIn, i), "yyyy-MM-dd"));
      }
      return { booking: b, occupiedDates, stayStart: b.check_in_date, stayEnd: b.check_out_date };
    });
  }, [relevantBookings, occupancyDays]);

  return { bookingOccupancy, relevantBookings };
}

export function checkAvailability(
  bookingOccupancy: BookingOccupancy[],
  checkInDate: string,
  occupancyDays: number,
  cageUnits: ("singola" | "doppia")[],
  totalSingole: number,
  totalDoppie: number,
): { available: boolean; conflicts: { date: string; type: "singola" | "doppia"; occupied: number; total: number }[] } {
  const conflicts: { date: string; type: "singola" | "doppia"; occupied: number; total: number }[] = [];
  const checkIn = parseISO(checkInDate);

  // Count how many of each type the new booking needs
  const needSingole = cageUnits.filter(t => t === "singola").length;
  const needDoppie = cageUnits.filter(t => t === "doppia").length;

  for (let i = 0; i < occupancyDays; i++) {
    const dateStr = format(addDays(checkIn, i), "yyyy-MM-dd");
    let singole = 0;
    let doppie = 0;
    for (const bo of bookingOccupancy) {
      if (bo.occupiedDates.has(dateStr)) {
        if (bo.booking.cage_pool_type === "singola") singole += bo.booking.units_occupied;
        else doppie += bo.booking.units_occupied;
      }
    }

    if (needSingole > 0 && singole + needSingole > totalSingole) {
      conflicts.push({ date: dateStr, type: "singola", occupied: singole, total: totalSingole });
    }
    if (needDoppie > 0 && doppie + needDoppie > totalDoppie) {
      conflicts.push({ date: dateStr, type: "doppia", occupied: doppie, total: totalDoppie });
    }
  }

  return { available: conflicts.length === 0, conflicts };
}

export function OccupancyGrid({
  bookings, occupancyDays, totalSingole, totalDoppie,
  rangeStart, rangeEnd, excludeBookingId, compact,
}: Props) {
  const today = new Date();

  const days = useMemo(() => {
    if (rangeStart > rangeEnd) return [];
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, [rangeStart, rangeEnd]);

  const { bookingOccupancy } = useOccupancyData(bookings, occupancyDays, excludeBookingId);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, { singole: number; doppie: number }> = {};
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      let singole = 0;
      let doppie = 0;
      for (const bo of bookingOccupancy) {
        if (bo.occupiedDates.has(dateStr)) {
          if (bo.booking.cage_pool_type === "singola") singole += bo.booking.units_occupied;
          else doppie += bo.booking.units_occupied;
        }
      }
      totals[dateStr] = { singole, doppie };
    }
    return totals;
  }, [days, bookingOccupancy]);

  // Expand bookings into individual rows per unit/cat
  const visibleRows = useMemo(() => {
    const startStr = format(rangeStart, "yyyy-MM-dd");
    const endStr = format(rangeEnd, "yyyy-MM-dd");
    const filtered = bookingOccupancy.filter(bo => bo.stayStart <= endStr && bo.stayEnd >= startStr);
    
    const rows: { bo: BookingOccupancy; catName: string; rowKey: string }[] = [];
    for (const bo of filtered) {
      const b = bo.booking;
      const cats = b.booking_cats?.map(bc => bc.cat?.name).filter(Boolean) ?? [];
      const units = b.units_occupied ?? 1;
      
      if (units <= 1 || cats.length <= 1) {
        // Single row
        rows.push({ bo, catName: cats.join(", ") || "—", rowKey: b.id });
      } else {
        // One row per cat/unit
        for (let i = 0; i < Math.max(units, cats.length); i++) {
          rows.push({ bo, catName: cats[i] || `Gatto ${i + 1}`, rowKey: `${b.id}-${i}` });
        }
      }
    }
    return rows;
  }, [bookingOccupancy, rangeStart, rangeEnd]);

  if (days.length === 0) return <div className="text-center py-4 text-muted-foreground text-sm">Nessun periodo</div>;

  return (
    <ScrollArea className="w-full rounded-lg border bg-card">
      <div className="min-w-max">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur px-3 py-2 text-left font-semibold min-w-[180px] border-r">
                Prenotazione
              </th>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isToday = dateStr === format(today, "yyyy-MM-dd");
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <th key={dateStr} className={cn(
                    "px-1 py-1.5 text-center font-medium min-w-[32px] border-r",
                    isToday && "bg-primary/10",
                    isWeekend && !isToday && "bg-muted/30"
                  )}>
                    <div className="text-[9px] text-muted-foreground">{format(day, "EEE", { locale: it })}</div>
                    <div className={cn("text-[11px]", isToday && "font-bold text-primary")}>{format(day, "d")}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td colSpan={days.length + 1} className="text-center py-6 text-muted-foreground">Nessuna prenotazione</td></tr>
            ) : visibleRows.map(({ bo, catName, rowKey }) => {
              const b = bo.booking;
              const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
              const poolLabel = b.cage_pool_type === "singola" ? "S" : "D";
              return (
                <tr key={rowKey} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-card/95 backdrop-blur px-2 py-1 border-r">
                    <div className="font-medium text-foreground truncate max-w-[160px] text-[11px]">{catName}</div>
                    <div className="text-muted-foreground truncate max-w-[160px] text-[10px]">
                      {clientName} · <span className={cn("font-semibold", b.cage_pool_type === "singola" ? "text-primary" : "text-accent")}>{poolLabel}</span> · #{b.booking_number}
                    </div>
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isOccupied = bo.occupiedDates.has(dateStr);
                    const isStay = dateStr >= bo.stayStart && dateStr <= bo.stayEnd;
                    return (
                      <td key={dateStr} className={cn("px-0 py-0 text-center border-r", compact ? "h-6" : "h-7")}>
                        {isOccupied ? (
                          <div className={cn("w-full h-full flex items-center justify-center",
                            b.cage_pool_type === "singola" ? "bg-primary/70" : "bg-accent/70"
                          )}>
                            <span className="text-[9px] font-bold text-primary-foreground">{poolLabel}</span>
                          </div>
                        ) : isStay ? (
                          <div className={cn("w-full h-full", b.cage_pool_type === "singola" ? "bg-primary/15" : "bg-accent/15")} />
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/50">
              <td className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-2 py-1 font-semibold border-r text-foreground text-[11px]">Singole occ.</td>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const occ = dailyTotals[dateStr]?.singole ?? 0;
                const pct = totalSingole > 0 ? occ / totalSingole : 0;
                return (
                  <td key={dateStr} className={cn("text-center font-semibold border-r py-1 text-[10px]",
                    pct >= 1 && "bg-destructive/20 text-destructive",
                    pct > 0 && pct < 1 && "bg-warning/20 text-warning-foreground"
                  )}>{occ}/{totalSingole}</td>
                );
              })}
            </tr>
            <tr className="border-t bg-muted/30">
              <td className="sticky left-0 z-10 bg-muted/70 backdrop-blur px-2 py-1 font-semibold border-r text-foreground text-[11px]">Doppie occ.</td>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const occ = dailyTotals[dateStr]?.doppie ?? 0;
                const pct = totalDoppie > 0 ? occ / totalDoppie : 0;
                return (
                  <td key={dateStr} className={cn("text-center font-semibold border-r py-1 text-[10px]",
                    pct >= 1 && "bg-destructive/20 text-destructive",
                    pct > 0 && pct < 1 && "bg-warning/20 text-warning-foreground"
                  )}>{occ}/{totalDoppie}</td>
                );
              })}
            </tr>
            <tr className="border-t bg-muted/50">
              <td className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-2 py-1 font-bold border-r text-foreground text-[11px]">Libere tot.</td>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const freeS = Math.max(0, totalSingole - (dailyTotals[dateStr]?.singole ?? 0));
                const freeD = Math.max(0, totalDoppie - (dailyTotals[dateStr]?.doppie ?? 0));
                const total = freeS + freeD;
                return (
                  <td key={dateStr} className={cn("text-center font-bold border-r py-1 text-[10px]",
                    total === 0 && "bg-destructive/20 text-destructive"
                  )}>{total}</td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
