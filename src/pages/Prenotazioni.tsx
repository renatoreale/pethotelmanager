import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, CalendarDays, MoreHorizontal } from "lucide-react";
import { AppointmentScheduleDialog } from "@/components/preventivi/AppointmentScheduleDialog";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useBookings, useTransitionBooking, getTransitions } from "@/hooks/useBookings";

const STATUS_OPTIONS = [
  { value: "tutti", label: "Tutti gli stati" },
  { value: "confermata", label: "Confermata" },
  { value: "appuntamento_in_fissato", label: "Appt. IN fissato" },
  { value: "appuntamento_out_fissato", label: "Appt. OUT fissato" },
  { value: "appuntamento_in_out_fissato", label: "Appt. IN-OUT fissati" },
  { value: "check_in", label: "Check-in" },
  { value: "in_corso", label: "In corso" },
  { value: "check_out", label: "Check-out" },
  { value: "chiusa", label: "Chiusa" },
  { value: "cancellata", label: "Cancellata" },
  { value: "rimborsata", label: "Rimborsata" },
  { value: "scaduto", label: "Scaduto" },
];

const STATUS_COLORS: Record<string, string> = {
  confermata: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  appuntamento_in_fissato: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  appuntamento_out_fissato: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  appuntamento_in_out_fissato: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  check_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  check_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  chiusa: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
  rimborsata: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  scaduto: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  confermata: "Confermata",
  appuntamento_in_fissato: "Appt. IN fissato",
  appuntamento_out_fissato: "Appt. OUT fissato",
  appuntamento_in_out_fissato: "Appt. IN-OUT fissati",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

export default function Prenotazioni() {
  const [statusFilter, setStatusFilter] = useState("tutti");
  const [search, setSearch] = useState("");
  const [transitioning, setTransitioning] = useState<{ id: string; bookingNumber: string; newStatus: string; label: string } | null>(null);
  const [schedulingBooking, setSchedulingBooking] = useState<any>(null);

  const { data: bookings, isLoading } = useBookings(statusFilter);
  const transitionBooking = useTransitionBooking();
  const { data: tenantConfig } = useTenantConfig();

  const stayCalcType = (tenantConfig as any)?.stay_calc_type ?? "notti";
  const countCheckinDay = (tenantConfig as any)?.count_checkin_day ?? true;
  const countCheckoutDay = (tenantConfig as any)?.count_checkout_day ?? true;

  const calcStayDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const diff = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  };

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      const clientName = `${b.client?.first_name ?? ""} ${b.client?.last_name ?? ""}`.toLowerCase();
      return clientName.includes(q) || b.booking_number.toLowerCase().includes(q);
    });
  }, [bookings, search]);

  const handleTransition = async () => {
    if (!transitioning) return;
    try {
      await transitionBooking.mutateAsync({ id: transitioning.id, newStatus: transitioning.newStatus });
      toast.success(`Prenotazione ${transitioning.bookingNumber}: ${transitioning.label}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nella transizione");
    }
    setTransitioning(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prenotazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestisci il workflow delle prenotazioni confermate</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per cliente o numero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} prenotazion{filtered.length === 1 ? "e" : "i"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto h-12 w-12 mb-4 opacity-30" />
              Nessuna prenotazione trovata
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Prenotazione</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gatti</TableHead>
                    <TableHead>Casetta</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>{stayCalcType === "notti" ? "Notti" : "Giorni"}</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[80px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const duration = calcStayDuration(b.check_in_date, b.check_out_date);
                    const catNames = b.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
                    const transitions = getTransitions(b.status);

                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                        <TableCell className="font-medium">
                          {b.client ? `${b.client.first_name} ${b.client.last_name}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{catNames}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {b.cage_pool_type === "singola" ? "Singola" : "Doppia"} ×{b.units_occupied}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(parseISO(b.check_in_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(b.check_out_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell className="font-medium">€ {Number(b.total_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? "bg-muted text-muted-foreground"}`}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transitions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {transitions.map((t) => (
                                  <DropdownMenuItem
                                    key={t.next}
                                    onClick={() => {
                                      if (t.next === "appuntamento_fissato" || t.next === "appuntamento_in_fissato" || t.next === "appuntamento_out_fissato" || t.next === "appuntamento_in_out_fissato") {
                                        setSchedulingBooking(b);
                                      } else {
                                        setTransitioning({
                                          id: b.id,
                                          bookingNumber: b.booking_number,
                                          newStatus: t.next,
                                          label: t.label,
                                        });
                                      }
                                    }}
                                  >
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!transitioning} onOpenChange={() => setTransitioning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{transitioning?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {transitioning && `Vuoi procedere con "${transitioning.label}" per la prenotazione ${transitioning.bookingNumber}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransition}
              className={transitioning?.newStatus === "cancellata" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppointmentScheduleDialog
        open={!!schedulingBooking}
        onOpenChange={(open) => { if (!open) setSchedulingBooking(null); }}
        booking={schedulingBooking}
      />
    </div>
  );
}
