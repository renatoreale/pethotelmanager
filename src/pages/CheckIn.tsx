import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LogIn, User, Cat, Calendar, CheckCircle2, CreditCard } from "lucide-react";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useBookings, useTransitionBooking } from "@/hooks/useBookings";
import { useInsertCatRegistry } from "@/hooks/useCatRegistry";
import { useCreatePayment, usePaymentMethods } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";

const CHECKIN_STATUSES = ["check_in", "appuntamento_in_fissato", "appuntamento_in_out_fissato"];

export default function CheckIn() {
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useBookings();
  const { data: paymentMethods } = usePaymentMethods();
  const transitionBooking = useTransitionBooking();
  const insertCatRegistry = useInsertCatRegistry();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState("");
  const [confirmBooking, setConfirmBooking] = useState<any>(null);

  // Transaction form state
  const [addTransaction, setAddTransaction] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"caparra" | "saldo" | "extra" | "rimborso">("saldo");
  const [txMethodId, setTxMethodId] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetTxForm = () => {
    setAddTransaction(false);
    setTxAmount("");
    setTxType("saldo");
    setTxMethodId("");
    setTxNotes("");
  };

  const openConfirm = (b: any) => {
    setConfirmBooking(b);
    resetTxForm();
  };

  const handleCheckIn = async () => {
    const booking = confirmBooking;
    if (!booking) return;

    // Validate transaction if enabled
    if (addTransaction) {
      const amount = parseFloat(txAmount);
      if (!amount || amount <= 0) { toast.error("Inserisci un importo valido"); return; }
      if (!txMethodId) { toast.error("Seleziona una modalità di pagamento"); return; }
    }

    setIsSubmitting(true);
    try {
      // 1. Transition booking
      await transitionBooking.mutateAsync({ id: booking.id, newStatus: "in_corso" });

      // 2. Insert cats into registry
      const clientName = booking.client
        ? `${booking.client.first_name} ${booking.client.last_name}`
        : "—";

      const cats = (booking.booking_cats ?? []).map((bc: any) => bc.cat).filter(Boolean);

      if (cats.length > 0 && profile?.tenant_id) {
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

      // 3. Create transaction if enabled
      if (addTransaction) {
        await createPayment.mutateAsync({
          booking_id: booking.id,
          amount: parseFloat(txAmount),
          payment_type: txType,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method_id: txMethodId,
          notes: txNotes || null,
        });
      }

      toast.success(`Check-in completato per ${clientName}`);
      setConfirmBooking(null);
    } catch (err: any) {
      toast.error("Errore durante il check-in: " + (err.message ?? ""));
    } finally {
      setIsSubmitting(false);
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
                  <Button onClick={() => openConfirm(b)} className="shrink-0">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check-in
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Check-in confirmation dialog with optional transaction */}
      <Dialog open={!!confirmBooking} onOpenChange={open => !open && setConfirmBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Conferma Check-in
            </DialogTitle>
          </DialogHeader>

          {confirmBooking && (
            <div className="space-y-4">
              {/* Booking summary */}
              <div className="rounded-md bg-muted p-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {confirmBooking.client?.first_name} {confirmBooking.client?.last_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto">{confirmBooking.booking_number}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Cat className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{(confirmBooking.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ") || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(parseISO(confirmBooking.check_in_date), "dd MMM yyyy", { locale: it })} → {format(parseISO(confirmBooking.check_out_date), "dd MMM yyyy", { locale: it })}
                  </span>
                </div>
                {confirmBooking.total_amount != null && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Totale: <strong>€ {Number(confirmBooking.total_amount).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              {/* Toggle for adding transaction */}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="add-tx" className="text-sm font-medium cursor-pointer">
                    Registra transazione
                  </Label>
                </div>
                <Switch
                  id="add-tx"
                  checked={addTransaction}
                  onCheckedChange={setAddTransaction}
                />
              </div>

              {/* Transaction form */}
              {addTransaction && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Importo (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={txAmount}
                        onChange={e => setTxAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={txType} onValueChange={v => setTxType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="caparra">Caparra</SelectItem>
                          <SelectItem value="saldo">Saldo</SelectItem>
                          <SelectItem value="extra">Extra</SelectItem>
                          <SelectItem value="rimborso">Rimborso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modalità di pagamento</Label>
                    <Select value={txMethodId} onValueChange={setTxMethodId}>
                      <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        {(paymentMethods ?? []).map(pm => (
                          <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Note</Label>
                    <Input
                      value={txNotes}
                      onChange={e => setTxNotes(e.target.value)}
                      placeholder="Opzionale"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                I gatti verranno automaticamente registrati nel Registro Gatti.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBooking(null)}>Annulla</Button>
            <Button onClick={handleCheckIn} disabled={isSubmitting}>
              {isSubmitting ? "In corso..." : "Conferma Check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
