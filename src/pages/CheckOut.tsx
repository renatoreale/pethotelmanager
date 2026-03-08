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
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { LogOut, User, Cat, Calendar, CheckCircle2, CreditCard, PawPrint } from "lucide-react";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useBookings, useTransitionBooking } from "@/hooks/useBookings";
import { useUpdateCatRegistryCheckout } from "@/hooks/useCatRegistry";
import { useCreatePayment, usePaymentMethods } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CHECKOUT_STATUSES = ["check_out", "in_corso", "appuntamento_out_fissato", "appuntamento_in_out_fissato"];

interface CatInfo {
  id: string;
  name: string;
  microchip: string;
  gender: string;
  breed: string;
  color: string;
  weight_kg: string;
}

export default function CheckOut() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useBookings();
  const { data: paymentMethods } = usePaymentMethods();
  const transitionBooking = useTransitionBooking();
  const updateCatRegistryCheckout = useUpdateCatRegistryCheckout();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState("");
  const [confirmBooking, setConfirmBooking] = useState<any>(null);

  // Payment form state
  const [addPayment, setAddPayment] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"caparra" | "saldo" | "extra" | "rimborso">("saldo");
  const [txMethodId, setTxMethodId] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cat details state (read-only display)
  const [catDetails, setCatDetails] = useState<CatInfo[]>([]);
  const [bookingPaidAmount, setBookingPaidAmount] = useState(0);

  const checkOutBookings = useMemo(() => {
    if (!bookings) return [];
    let filtered = bookings.filter(b => CHECKOUT_STATUSES.includes(b.status));
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
    return filtered.sort((a, b) => a.check_out_date.localeCompare(b.check_out_date));
  }, [bookings, search]);

  const resetForm = () => {
    setAddPayment(false);
    setTxAmount("");
    setTxType("saldo");
    setTxMethodId("");
    setTxNotes("");
    setCatDetails([]);
  };

  const openConfirm = async (b: any) => {
    setConfirmBooking(b);
    resetForm();
    setBookingPaidAmount(0);

    // Load payments to calculate residuo
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_type")
      .eq("booking_id", b.id);

    if (payments) {
      const paid = payments.filter(p => p.payment_type !== "rimborso").reduce((s, p) => s + Number(p.amount), 0);
      const refunded = payments.filter(p => p.payment_type === "rimborso").reduce((s, p) => s + Number(p.amount), 0);
      setBookingPaidAmount(paid - refunded);
    }

    // Load full cat details
    const cats = (b.booking_cats ?? []).map((bc: any) => bc.cat).filter(Boolean);
    if (cats.length > 0) {
      const catIds = cats.map((c: any) => c.id);
      const { data: fullCats } = await supabase
        .from("cats")
        .select("id, name, microchip, gender, breed, color, weight_kg")
        .in("id", catIds);

      setCatDetails(
        (fullCats ?? cats).map((c: any) => ({
          id: c.id,
          name: c.name ?? "",
          microchip: c.microchip ?? "",
          gender: c.gender ?? "",
          breed: c.breed ?? "",
          color: c.color ?? "",
          weight_kg: c.weight_kg != null ? String(c.weight_kg) : "",
        }))
      );
    }
  };

  const updateCatField = (catId: string, field: keyof CatInfo, value: string) => {
    setCatDetails(prev =>
      prev.map(c => (c.id === catId ? { ...c, [field]: value } : c))
    );
  };

  const handleCheckOut = async () => {
    const booking = confirmBooking;
    if (!booking) return;

    if (addPayment) {
      const amount = parseFloat(txAmount);
      if (!amount || amount <= 0) { toast.error("Inserisci un importo valido"); return; }
      if (!txMethodId) { toast.error("Seleziona una modalità di pagamento"); return; }
    }

    setIsSubmitting(true);
    try {
      const clientName = booking.client
        ? `${booking.client.first_name} ${booking.client.last_name}`
        : "—";

      // 1. Update cat details in the cats table
      for (const cat of catDetails) {
        const updates: any = {};
        if (cat.microchip) updates.microchip = cat.microchip;
        if (cat.gender) updates.gender = cat.gender;
        if (cat.breed) updates.breed = cat.breed;
        if (cat.color) updates.color = cat.color;
        if (cat.weight_kg) updates.weight_kg = parseFloat(cat.weight_kg);
        if (Object.keys(updates).length > 0) {
          await supabase.from("cats").update(updates).eq("id", cat.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["cats"] });

      // 2. Update cat registry: set check_out_date and reason
      const today = format(new Date(), "yyyy-MM-dd");
      await updateCatRegistryCheckout.mutateAsync({
        bookingId: booking.id,
        checkOutDate: today,
        reason: "Ritorno a casa",
      });

      // 3. Also update microchip in registry rows
      await Promise.all(
        catDetails.map(async (cat) => {
          await supabase
            .from("cat_registry")
            .update({
              microchip: cat.microchip || null,
              cat_name: cat.name,
              client_name: clientName,
            })
            .eq("booking_id", booking.id)
            .eq("cat_id", cat.id);
        })
      );
      queryClient.invalidateQueries({ queryKey: ["cat-registry"] });

      // 4. Transition booking to "chiusa"
      await transitionBooking.mutateAsync({ id: booking.id, newStatus: "chiusa" });

      // 5. Create payment if enabled
      if (addPayment) {
        await createPayment.mutateAsync({
          booking_id: booking.id,
          amount: parseFloat(txAmount),
          payment_type: txType,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method_id: txMethodId,
          notes: txNotes || null,
        });
      }

      toast.success(`Check-out completato per ${clientName}`);
      setConfirmBooking(null);
    } catch (err: any) {
      toast.error("Errore durante il check-out: " + (err.message ?? ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-out</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dimissione gatti dalla struttura. Seleziona una prenotazione per effettuare il check-out.
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
      ) : !checkOutBookings.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <LogOut className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nessuna prenotazione pronta per il check-out</p>
          <p className="text-sm mt-1">Le prenotazioni in corso appariranno qui quando sarà il momento del check-out.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {checkOutBookings.map(b => {
            const clientName = b.client ? `${b.client.first_name} ${b.client.last_name}` : "—";
            const catNames = (b.booking_cats ?? []).map(bc => bc.cat?.name).filter(Boolean).join(", ");
            const isToday = b.check_out_date === format(new Date(), "yyyy-MM-dd");

            return (
              <Card key={b.id} className={`transition-all ${isToday ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{clientName}</span>
                      <Badge variant="outline" className="text-[10px] h-5">{b.booking_number}</Badge>
                      {isToday && <Badge variant="destructive" className="text-[10px] h-5">Oggi</Badge>}
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
                  <Button variant="destructive" onClick={() => openConfirm(b)} className="shrink-0">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check-out
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Check-out confirmation dialog */}
      <Dialog open={!!confirmBooking} onOpenChange={open => !open && setConfirmBooking(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Conferma Check-out
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
                {confirmBooking.total_amount != null && (() => {
                  const total = Number(confirmBooking.total_amount);
                  const residuo = total - bookingPaidAmount;
                  return (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        Totale: <strong>€ {total.toFixed(2)}</strong>
                        {" · "}Pagato: <strong>€ {bookingPaidAmount.toFixed(2)}</strong>
                        {" · "}Residuo: <strong className={residuo > 0 ? "text-destructive" : ""}>€ {residuo.toFixed(2)}</strong>
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Cat details section */}
              {catDetails.length > 0 && (
                <Accordion type="multiple" className="w-full">
                  {catDetails.map(cat => (
                    <AccordionItem key={cat.id} value={cat.id}>
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <PawPrint className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{cat.name}</span>
                          {!cat.microchip && (
                            <Badge variant="outline" className="text-[10px] h-5 text-destructive border-destructive">
                              Dati incompleti
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Microchip</Label>
                              <Input
                                value={cat.microchip}
                                onChange={e => updateCatField(cat.id, "microchip", e.target.value)}
                                placeholder="Numero microchip"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Sesso</Label>
                              <Select value={cat.gender} onValueChange={v => updateCatField(cat.id, "gender", v)}>
                                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="maschio">Maschio</SelectItem>
                                  <SelectItem value="femmina">Femmina</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Razza</Label>
                              <Input
                                value={cat.breed}
                                onChange={e => updateCatField(cat.id, "breed", e.target.value)}
                                placeholder="Es. Europeo"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Colore</Label>
                              <Input
                                value={cat.color}
                                onChange={e => updateCatField(cat.id, "color", e.target.value)}
                                placeholder="Es. Tigrato"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Peso (kg)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={cat.weight_kg}
                                onChange={e => updateCatField(cat.id, "weight_kg", e.target.value)}
                                placeholder="Es. 4.5"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {/* Registry info */}
              <div className="rounded-md bg-muted/50 border p-3 text-sm">
                <p className="text-muted-foreground">
                  Il registro gatti verrà aggiornato con la data di check-out odierna e motivazione <strong>"Ritorno a casa"</strong>.
                </p>
              </div>

              {/* Payment toggle */}
              <div className="flex items-center gap-3 pt-1">
                <Switch id="add-payment" checked={addPayment} onCheckedChange={setAddPayment} />
                <Label htmlFor="add-payment" className="text-sm font-medium cursor-pointer">
                  Registra pagamento
                </Label>
              </div>

              {addPayment && (
                <div className="space-y-3 rounded-md border p-3">
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
                          <SelectItem value="saldo">Saldo</SelectItem>
                          <SelectItem value="extra">Extra</SelectItem>
                          <SelectItem value="caparra">Caparra</SelectItem>
                          <SelectItem value="rimborso">Rimborso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Metodo di pagamento</Label>
                    <Select value={txMethodId} onValueChange={setTxMethodId}>
                      <SelectTrigger><SelectValue placeholder="Seleziona metodo..." /></SelectTrigger>
                      <SelectContent>
                        {(paymentMethods ?? []).filter((m: any) => m.is_active).map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Note (opzionale)</Label>
                    <Input value={txNotes} onChange={e => setTxNotes(e.target.value)} placeholder="Note sul pagamento..." />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBooking(null)}>Annulla</Button>
            <Button
              variant="destructive"
              onClick={handleCheckOut}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Elaborazione..." : "Conferma Check-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
