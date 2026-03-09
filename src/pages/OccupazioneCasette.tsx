import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { OccupancyGrid } from "@/components/OccupancyGrid";

export default function OccupazioneCasette() {
  const today = new Date();
  const [rangeStart, setRangeStart] = useState<Date>(startOfMonth(today));
  const [rangeEnd, setRangeEnd] = useState<Date>(endOfMonth(today));
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: tenantConfig, isLoading: loadingConfig } = useTenantConfig();

  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 3;
  const totalSingole = tenantConfig?.num_singole ?? 0;
  const totalDoppie = tenantConfig?.num_doppie ?? 0;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;

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
            Visualizza l'occupazione per periodo{petType !== "cani" ? ` · Regola occupazione: ${occupancyDays} giorni` : " · Occupazione per intero soggiorno"}
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
              <Calendar mode="single" selected={rangeStart} onSelect={(d) => d && setRangeStart(d)} className="p-3 pointer-events-auto" />
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
              <Calendar mode="single" selected={rangeEnd} onSelect={(d) => d && setRangeEnd(d)} className="p-3 pointer-events-auto" />
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
          <span>{petType === "cani" ? "Occupazione (intero soggiorno)" : `Occupazione (regola ${occupancyDays}gg)`}</span>
        </div>
        {petType !== "cani" && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <span>Soggiorno (non occupa)</span>
          </div>
        )}
        <span>Singole: {totalSingole} · Doppie: {totalDoppie}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento…</div>
      ) : (
        <OccupancyGrid
          bookings={bookings ?? []}
          occupancyDays={occupancyDays}
          totalSingole={totalSingole}
          totalDoppie={totalDoppie}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      )}
    </div>
  );
}
