import { useState, useMemo } from "react";
import { format, addDays, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function OccupazioneCasette() {
  const today = new Date();
  const [rangeStart, setRangeStart] = useState<Date>(startOfMonth(today));
  const [rangeEnd, setRangeEnd] = useState<Date>(endOfMonth(today));
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: tenantConfig, isLoading: loadingConfig } = useTenantConfig();

  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 3;
  const totalSingole = tenantConfig?.num_singole ?? 0;
  const totalDoppie = tenantConfig?.num_doppie ?? 0;

  const days = useMemo(() => {
    if (rangeStart > rangeEnd) return [];
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, [rangeStart, rangeEnd]);

  // Filter bookings that are "active" (not preventivo, not cancelled/refunded)
  const activeStatuses = [
    "confermata", "appuntamento_fissato", "appuntamento_in_fissato",
    "appuntamento_out_fissato", "appuntamento_in_out_fissato",
    "check_in", "in_corso", "check_out", "chiusa",
  ];

  const relevantBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(b => activeStatuses.includes(b.status));
  }, [bookings]);

  // For each booking, compute the occupancy days based on occupancy_rule_days from check_in
  const bookingOccupancy = useMemo(() => {
    return relevantBookings.map(b => {
      const checkIn = parseISO(b.check_in_date);
      const checkOut = parseISO(b.check_out_date);
      // Occupancy: from check_in for min(occupancyDays, stay length) days
      const stayDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const occDays = Math.min(occupancyDays, stayDays);
      const occupiedDates = new Set<string>();
      for (let i = 0; i < occDays; i++) {
        occupiedDates.add(format(addDays(checkIn, i), "yyyy-MM-dd"));
      }
      return {
        booking: b,
        occupiedDates,
        stayStart: b.check_in_date,
        stayEnd: b.check_out_date,
      };
    });
  }, [relevantBookings, occupancyDays]);

  // Daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, { singole: number; doppie: number }> = {};
    for (const day of days) {
      const dateStr = format(day, "yyyy-MM-dd");
      let singole = 0;
      let doppie = 0;
      for (const bo of bookingOccupancy) {
        if (bo.occupiedDates.has(dateStr)) {
          if (bo.booking.cage_pool_type === "singola") {
            singole += bo.booking.units_occupied;
          } else {
            doppie += bo.booking.units_occupied;
          }
        }
      }
      totals[dateStr] = { singole, doppie };
    }
    return totals;
  }, [days, bookingOccupancy]);

  // Filter bookings visible in selected range
  const visibleBookings = useMemo(() => {
    const rangeStartStr = format(rangeStart, "yyyy-MM-dd");
    const rangeEndStr = format(rangeEnd, "yyyy-MM-dd");
    return bookingOccupancy.filter(bo => {
      // Show if booking's stay overlaps with the selected range
      return bo.stayStart <= rangeEndStr && bo.stayEnd >= rangeStartStr;
    });
  }, [bookingOccupancy, rangeStart, rangeEnd]);

  const setMonth = (offset: number) => {
    const newStart = new Date(rangeStart);
    newStart.setMonth(newStart.getMonth() + offset);
    setRangeStart(startOfMonth(newStart));
    setRangeEnd(endOfMonth(newStart));
  };

  const isLoading = loadingBookings || loadingConfig;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Occupazione Casette</h1>
          <p className="text-sm text-muted-foreground">
            Visualizza l'occupazione per periodo · Regola occupazione: {occupancyDays} giorni
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[130px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(rangeStart, "dd MMM", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={rangeStart}
                onSelect={(d) => d && setRangeStart(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">→</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[130px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(rangeEnd, "dd MMM", { locale: it })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={rangeEnd}
                onSelect={(d) => d && setRangeEnd(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={() => setMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/70" />
          <span>Occupazione (regola {occupancyDays}gg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <span>Soggiorno (non occupa)</span>
        </div>
        <span>Singole: {totalSingole} · Doppie: {totalDoppie}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento…</div>
      ) : days.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Seleziona un periodo valido</div>
      ) : (
        <ScrollArea className="w-full rounded-lg border bg-card">
          <div className="min-w-max">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur px-3 py-2 text-left font-semibold min-w-[200px] border-r">
                    Prenotazione
                  </th>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isToday = dateStr === format(today, "yyyy-MM-dd");
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <th
                        key={dateStr}
                        className={cn(
                          "px-1 py-2 text-center font-medium min-w-[36px] border-r",
                          isToday && "bg-primary/10",
                          isWeekend && !isToday && "bg-muted/30"
                        )}
                      >
                        <div className="text-[10px] text-muted-foreground">
                          {format(day, "EEE", { locale: it })}
                        </div>
                        <div className={cn(
                          "text-xs",
                          isToday && "font-bold text-primary"
                        )}>
                          {format(day, "d")}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleBookings.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-muted-foreground">
                      Nessuna prenotazione nel periodo selezionato
                    </td>
                  </tr>
                ) : (
                  visibleBookings.map((bo) => {
                    const b = bo.booking;
                    const catNames = b.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
                    const clientName = b.client
                      ? `${b.client.first_name} ${b.client.last_name}`
                      : "—";
                    const poolLabel = b.cage_pool_type === "singola" ? "S" : "D";

                    return (
                      <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-card/95 backdrop-blur px-3 py-1.5 border-r">
                          <div className="font-medium text-foreground truncate max-w-[180px]">
                            {catNames}
                          </div>
                          <div className="text-muted-foreground truncate max-w-[180px]">
                            {clientName} · <span className={cn(
                              "font-semibold",
                              b.cage_pool_type === "singola" ? "text-primary" : "text-accent"
                            )}>{poolLabel}{b.units_occupied > 1 ? `×${b.units_occupied}` : ""}</span> · #{b.booking_number}
                          </div>
                        </td>
                        {days.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isOccupied = bo.occupiedDates.has(dateStr);
                          const isStay = dateStr >= bo.stayStart && dateStr <= bo.stayEnd;
                          const isToday = dateStr === format(today, "yyyy-MM-dd");

                          return (
                            <td
                              key={dateStr}
                              className={cn(
                                "px-0 py-0 text-center border-r h-8",
                                isToday && "bg-primary/5"
                              )}
                            >
                              {isOccupied ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "w-full h-full min-h-[32px] flex items-center justify-center",
                                      b.cage_pool_type === "singola"
                                        ? "bg-primary/70"
                                        : "bg-accent/70"
                                    )}>
                                      <span className="text-[10px] font-bold text-primary-foreground">
                                        {poolLabel}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{catNames} — {clientName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Casetta {b.cage_pool_type} · Occupa capacità
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : isStay ? (
                                <div className={cn(
                                  "w-full h-full min-h-[32px]",
                                  b.cage_pool_type === "singola"
                                    ? "bg-primary/15"
                                    : "bg-accent/15"
                                )} />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-3 py-1.5 font-semibold border-r text-foreground">
                    Singole occupate
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const occ = dailyTotals[dateStr]?.singole ?? 0;
                    const pct = totalSingole > 0 ? occ / totalSingole : 0;
                    return (
                      <td key={dateStr} className={cn(
                        "text-center font-semibold border-r py-1.5",
                        pct >= 1 && "bg-destructive/20 text-destructive",
                        pct > 0 && pct < 1 && "bg-warning/20 text-warning-foreground"
                      )}>
                        {occ}/{totalSingole}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t bg-muted/30">
                  <td className="sticky left-0 z-10 bg-muted/70 backdrop-blur px-3 py-1.5 font-semibold border-r text-foreground">
                    Doppie occupate
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const occ = dailyTotals[dateStr]?.doppie ?? 0;
                    const pct = totalDoppie > 0 ? occ / totalDoppie : 0;
                    return (
                      <td key={dateStr} className={cn(
                        "text-center font-semibold border-r py-1.5",
                        pct >= 1 && "bg-destructive/20 text-destructive",
                        pct > 0 && pct < 1 && "bg-warning/20 text-warning-foreground"
                      )}>
                        {occ}/{totalDoppie}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/90 backdrop-blur px-3 py-1.5 font-bold border-r text-foreground">
                    Libere totali
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const occS = dailyTotals[dateStr]?.singole ?? 0;
                    const occD = dailyTotals[dateStr]?.doppie ?? 0;
                    const freeS = Math.max(0, totalSingole - occS);
                    const freeD = Math.max(0, totalDoppie - occD);
                    const total = freeS + freeD;
                    return (
                      <td key={dateStr} className={cn(
                        "text-center font-bold border-r py-1.5",
                        total === 0 && "bg-destructive/20 text-destructive"
                      )}>
                        {total}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
