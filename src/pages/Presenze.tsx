import { useState, useMemo } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { it } from "date-fns/locale";
import { Cat, Dog, CalendarIcon, Search, PawPrint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCatRegistry } from "@/hooks/useCatRegistry";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { usePetLabels } from "@/hooks/usePetLabels";

function calcStayDays(
  checkIn: string,
  checkOut: string,
  stayCalcType: string,
  countCheckinDay: boolean,
  countCheckoutDay: boolean
): number {
  const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  if (stayCalcType === "notti") return nights;
  // "giorni" mode: inclusive count adjusted by flags
  let days = nights + 1;
  if (!countCheckinDay) days--;
  if (!countCheckoutDay) days--;
  return Math.max(days, 0);
}

export default function Presenze() {
  const { data: entries, isLoading } = useCatRegistry();
  const { data: tenantConfig } = useTenantConfig();
  const pet = usePetLabels();
  const PetIcon = pet.iconName === "Cat" ? Cat : pet.iconName === "Dog" ? Dog : PawPrint;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const stayCalcType = tenantConfig?.stay_calc_type ?? "notti";
  const countCheckinDay = tenantConfig?.count_checkin_day ?? true;
  const countCheckoutDay = tenantConfig?.count_checkout_day ?? true;

  const catsPresent = useMemo(() => {
    if (!entries) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    let list = entries.filter((e: any) => {
      const checkIn = e.check_in_date;
      // Use actual check-out if available, otherwise use booking's planned check-out
      const checkOut = e.check_out_date || e.booking?.check_out_date;
      return checkIn <= dateStr && (!checkOut || checkOut >= dateStr);
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e: any) =>
        e.cat_name?.toLowerCase().includes(q) ||
        e.client_name?.toLowerCase().includes(q) ||
        e.microchip?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [entries, selectedDate, search]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const checkInsToday = useMemo(() => 
    (entries ?? []).filter((e: any) => e.check_in_date === dateStr).length,
    [entries, dateStr]
  );
  const checkOutsToday = useMemo(() => 
    (entries ?? []).filter((e: any) => e.booking?.check_out_date === dateStr).length,
    [entries, dateStr]
  );

  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Presenze in Pensione</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualizza {pet.articlePlural} presenti nella struttura alla data selezionata.
        </p>
      </div>

      {/* Date picker + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[220px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "dd MMMM yyyy", { locale: it })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) setSelectedDate(d);
                setCalendarOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Oggi
          </Button>
        )}

        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cerca ${pet.singular}, cliente o microchip...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Presenti</div>
          <div className="text-2xl font-bold font-mono mt-1 text-primary">{catsPresent.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Check-in</div>
          <div className="text-2xl font-bold font-mono mt-1 text-green-600">{checkInsToday}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Check-out</div>
          <div className="text-2xl font-bold font-mono mt-1 text-orange-600">{checkOutsToday}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !catsPresent.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <PetIcon className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nessun {pet.singular} presente</p>
          <p className="text-sm mt-1">
            {isToday
              ? `Non ci sono ${pet.plural} in struttura oggi.`
              : `Non risultano ${pet.plural} presenti il ${format(selectedDate, "dd/MM/yyyy")}.`}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gatto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Microchip</TableHead>
                <TableHead>Razza</TableHead>
                <TableHead>Sesso</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out previsto</TableHead>
                <TableHead className="text-center">
                  {stayCalcType === "notti" ? "Notti" : "Giorni"}
                </TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catsPresent.map((entry: any) => {
                const bookingCheckOut = entry.booking?.check_out_date;
                const stayDays = bookingCheckOut
                  ? calcStayDays(entry.check_in_date, bookingCheckOut, stayCalcType, countCheckinDay, countCheckoutDay)
                  : null;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Cat className="h-4 w-4 text-muted-foreground" />
                        {entry.cat_name}
                      </div>
                    </TableCell>
                    <TableCell>{entry.client_name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.microchip ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.cats?.breed ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.cats?.gender ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(entry.check_in_date), "dd MMM yyyy", { locale: it })}
                    </TableCell>
                    <TableCell>
                      {bookingCheckOut
                        ? format(parseISO(bookingCheckOut), "dd MMM yyyy", { locale: it })
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold">
                      {stayDays != null ? stayDays : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
