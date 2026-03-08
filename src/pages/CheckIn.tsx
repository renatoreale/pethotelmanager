import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn, User, Cat, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useBookings, useTransitionBooking } from "@/hooks/useBookings";
import { useInsertCatRegistry } from "@/hooks/useCatRegistry";
import { useAuth } from "@/hooks/useAuth";

// Statuses that allow check-in
const CHECKIN_STATUSES = ["check_in", "appuntamento_in_fissato", "appuntamento_in_out_fissato"];

export default function CheckIn() {
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useBookings();
  const transitionBooking = useTransitionBooking();
  const insertCatRegistry = useInsertCatRegistry();

  const [search, setSearch] = useState("");
  const [confirmBooking, setConfirmBooking] = useState<any>(null);

  // Filter bookings ready for check-in
  const checkInBookings = useMemo(() => {
    if (!bookings) return [];
    let filtered = bookings.filter(b => CHECKIN_STATUSES.includes(b.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b => {
        const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "";
        const catNames = (b.booking_cats ?? []).map(bc => bc.cat?.name ?? "").join(" ");
        return (
          clientName.toLowerCase().includes(q) ||
          catNames.toLowerCase().includes(q) ||
          b.booking_number.toLowerCase().includes(q)
        );
      });
    }
    return filtered.sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  }, [bookings, search]);

  const handleCheckIn = async (booking: any) => {
    try {
      // 1. Transition booking to "in_corso"
      await transitionBooking.mutateAsync({ id: booking.id, newStatus: "in_corso" });

      // 2. Insert cats into registry
      const clientName = booking.client
        ? `${booking.client.first_name} ${booking.client.last_name}`
        : "—";

      const cats = (booking.booking_cats ?? []).map((bc: any) => bc.cat).filter(Boolean);

      if (cats.length > 0 && profile?.tenant_id) {
        // Fetch full cat details for microchip
        const { supabase } = await import("@/integrations/supabase/client");
        const catIds = cats.map((c: any) => c.id);
        const { data: fullCats } = await supabase
          .from("cats")
          .select("id, name, microchip")
          .in("id", catIds);

        const entries = (fullCats ?? cats).map((cat: any) => ({
          tenant_id: profile.tenant_id!,
          booking_id: booking.id,
          cat_id: cat.id,
          client_name: clientName,
          cat_name: cat.name,
          microchip: cat.microchip ?? null,
          check_in_date: booking.check_in_date,
        }));

        await insertCatRegistry.mutateAsync(entries);
      }

      toast.success(`Check-in completato per ${clientName}`);
      setConfirmBooking(null);
    } catch (err: any) {
      toast.error("Errore durante il check-in: " + (err.message ?? ""));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Accettazione gatti in struttura. Seleziona una prenotazione per effettuare il check-in.
        </p>
      </div>

      <AutocompleteSearch
        value={search}
        onChange={setSearch}
        placeholder="Cerca cliente, gatto o numero prenotazione..."
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !checkInBookings.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <LogIn className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nessuna prenotazione pronta per il check-in</p>
          <p className="text-sm mt-1">Le prenotazioni appariranno qui quando avranno un appuntamento di check-in fissato.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {checkInBookings.map(b => {
            const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
            const catNames = (b.booking_cats ?? []).map(bc => bc.cat?.name).filter(Boolean).join(", ");
            const isToday = b.check_in_date === format(new Date(), "yyyy-MM-dd");

            return (
              <Card key={b.id} className={`transition-all ${isToday ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <LogIn className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{clientName}</span>
                      <Badge variant="outline" className="text-[10px] h-5">{b.booking_number}</Badge>
                      {isToday && <Badge className="text-[10px] h-5">Oggi</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {catNames && (
                        <span className="flex items-center gap-1">
                          <Cat className="h-3.5 w-3.5" />{catNames}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseISO(b.check_in_date), "dd MMM yyyy", { locale: it })} → {format(parseISO(b.check_out_date), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => setConfirmBooking(b)} className="shrink-0">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check-in
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmBooking} onOpenChange={open => !open && setConfirmBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Conferma Check-in
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Stai per effettuare il check-in per la prenotazione{" "}
                  <strong>{confirmBooking?.booking_number}</strong>.
                </p>
                {confirmBooking && (
                  <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      <span>{confirmBooking.client?.first_name} {confirmBooking.client?.last_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cat className="h-3.5 w-3.5" />
                      <span>{(confirmBooking.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(parseISO(confirmBooking.check_in_date), "dd MMM yyyy", { locale: it })} → {format(parseISO(confirmBooking.check_out_date), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  I gatti verranno automaticamente registrati nel Registro Gatti.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmBooking && handleCheckIn(confirmBooking)}
              disabled={transitionBooking.isPending || insertCatRegistry.isPending}
            >
              Conferma Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
