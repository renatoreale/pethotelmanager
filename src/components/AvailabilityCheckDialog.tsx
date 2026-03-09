import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OccupancyGrid, useOccupancyData } from "@/components/OccupancyGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import type { Booking } from "@/hooks/useBookings";

export function AvailabilityCheckDialog() {
  const [open, setOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [cageType, setCageType] = useState<"singola" | "doppia">("singola");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { profile } = useAuth();
  const { data: tenantConfig } = useTenantConfig();

  const { data: allBookings } = useQuery({
    queryKey: ["bookings-availability", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          client:clients(id, first_name, last_name, email, phone),
          booking_cats(id, cat_id, cat:cats(id, name))
        `)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "cancellata")
        .neq("status", "rimborsata")
        .neq("status", "scaduto");
      if (error) throw error;
      return data as unknown as Booking[];
    },
    enabled: !!profile?.tenant_id && open,
  });

  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 4;
  const totalSingole = tenantConfig?.num_singole ?? 0;
  const totalDoppie = tenantConfig?.num_doppie ?? 0;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;
  
  // Per-type totals for "entrambi" facilities
  const singoleGatti = (tenantConfig as any)?.num_singole_gatti ?? 0;
  const doppieGatti = (tenantConfig as any)?.num_doppie_gatti ?? 0;
  const singoleCani = (tenantConfig as any)?.num_singole_cani ?? 0;
  const doppieCani = (tenantConfig as any)?.num_doppie_cani ?? 0;

  const rangeStart = useMemo(() => subDays(checkInDate, 5), [checkInDate]);
  const rangeEnd = useMemo(() => addDays(checkInDate, 5), [checkInDate]);
  const highlightDate = format(checkInDate, "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Verifica disponibilità
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verifica disponibilità casette</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data check-in</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-w-[160px] justify-start">
                  <CalendarIcon className="h-4 w-4" />
                  {format(checkInDate, "dd MMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkInDate}
                  onSelect={(d) => { if (d) { setCheckInDate(d); setCalendarOpen(false); } }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo casetta</Label>
            <Select value={cageType} onValueChange={(v) => setCageType(v as "singola" | "doppia")}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="singola">Singola</SelectItem>
                <SelectItem value="doppia">Doppia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {petType === "entrambi" ? (
          <>
            <AvailabilityAlert
              bookings={allBookings ?? []}
              occupancyDays={occupancyDays}
              checkInDate={highlightDate}
              cageType={cageType}
              totalSingole={singoleGatti}
              totalDoppie={doppieGatti}
              petType="gatti"
              filterPetType="gatti"
              label="🐱 Gatti"
            />
            <AvailabilityAlert
              bookings={allBookings ?? []}
              occupancyDays={occupancyDays}
              checkInDate={highlightDate}
              cageType={cageType}
              totalSingole={singoleCani}
              totalDoppie={doppieCani}
              petType="cani"
              filterPetType="cani"
              label="🐶 Cani"
            />
          </>
        ) : (
          <AvailabilityAlert
            bookings={allBookings ?? []}
            occupancyDays={occupancyDays}
            checkInDate={highlightDate}
            cageType={cageType}
            totalSingole={totalSingole}
            totalDoppie={totalDoppie}
            petType={petType}
          />
        )}

        <OccupancyGrid
          bookings={allBookings ?? []}
          occupancyDays={occupancyDays}
          totalSingole={totalSingole}
          totalDoppie={totalDoppie}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          highlightDate={highlightDate}
          petType={petType}
        />
      </DialogContent>
    </Dialog>
  );
}

function AvailabilityAlert({
  bookings, occupancyDays, checkInDate, cageType, totalSingole, totalDoppie, petType, filterPetType, label,
}: {
  bookings: Booking[];
  occupancyDays: number;
  checkInDate: string;
  cageType: "singola" | "doppia";
  totalSingole: number;
  totalDoppie: number;
  petType?: "gatti" | "cani" | "entrambi";
  filterPetType?: "gatti" | "cani";
  label?: string;
}) {
  const { bookingOccupancy } = useOccupancyData(bookings, occupancyDays, undefined, petType);

  const availability = useMemo(() => {
    const checkIn = new Date(checkInDate);
    const total = cageType === "singola" ? totalSingole : totalDoppie;
    let maxOccupied = 0;

    for (let i = 0; i < occupancyDays; i++) {
      const dateStr = format(addDays(checkIn, i), "yyyy-MM-dd");
      let occupied = 0;
      for (const bo of bookingOccupancy) {
        if (bo.occupiedDates.has(dateStr) && bo.booking.cage_pool_type === cageType) {
          occupied += bo.booking.units_occupied;
        }
      }
      maxOccupied = Math.max(maxOccupied, occupied);
    }

    const free = Math.max(0, total - maxOccupied);
    return { free, total, maxOccupied };
  }, [bookingOccupancy, checkInDate, cageType, totalSingole, totalDoppie, occupancyDays]);

  const isAvailable = availability.free > 0;

  return (
    <Alert className={cn(
      "mb-2",
      isAvailable
        ? "border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
        : "border-destructive/50 bg-destructive/10 text-destructive"
    )}>
      {isAvailable ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <AlertDescription className="ml-2 font-medium">
        {isAvailable
          ? `Disponibile! ${availability.free} casett${availability.free === 1 ? "a" : "e"} ${cageType === "singola" ? "singol" + (availability.free === 1 ? "a" : "e") : "doppi" + (availability.free === 1 ? "a" : "e")} liber${availability.free === 1 ? "a" : "e"} nel periodo di occupazione.`
          : `Non disponibile. Tutte le ${availability.total} casette ${cageType === "singola" ? "singole" : "doppie"} sono occupate in almeno un giorno del periodo.`
        }
      </AlertDescription>
    </Alert>
  );
}
