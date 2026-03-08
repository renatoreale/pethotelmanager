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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { LogOut, User, Cat, Calendar, CheckCircle2, CreditCard, PawPrint, CalendarIcon } from "lucide-react";
import { BookingDrillDown } from "@/components/BookingDrillDown";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBookings, useTransitionBooking } from "@/hooks/useBookings";
import { useUpdateCatRegistryCheckout } from "@/hooks/useCatRegistry";
import { useCreatePayment, usePaymentMethods } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { useTenantConfig, usePriceLists } from "@/hooks/usePensioneConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CHECKOUT_STATUSES = ["in_corso"];

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
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();
  const transitionBooking = useTransitionBooking();
  const updateCatRegistryCheckout = useUpdateCatRegistryCheckout();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState("");
  const [confirmBooking, setConfirmBooking] = useState<any>(null);

  // Date state
  const [actualCheckOutDate, setActualCheckOutDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Payment form state
  const [addPayment, setAddPayment] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"caparra" | "saldo" | "extra" | "rimborso">("saldo");
  const [txMethodId, setTxMethodId] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cat details state
  const [catDetails, setCatDetails] = useState<CatInfo[]>([]);
  const [bookingPaidAmount, setBookingPaidAmount] = useState(0);
  const [manualExtraCost, setManualExtraCost] = useState<string | null>(null);

  const stayCalcType = tenantConfig?.stay_calc_type ?? "notti";
  const countCheckinDay = tenantConfig?.count_checkin_day ?? true;
  const countCheckoutDay = tenantConfig?.count_checkout_day ?? true;

  const calcDuration = (ciStr: string, coStr: string) => {
    if (!ciStr || !coStr) return 0;
    const diff = differenceInDays(parseISO(coStr), parseISO(ciStr));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  };

  const seasonalTariffs = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter((pl: any) => pl.tariff_type === "stagionale" && pl.is_active);
  }, [priceLists]);

  const findSeasonalTariff = (dateStr: string) => {
    return seasonalTariffs.find((t: any) => {
      if (!t.valid_from || !t.valid_to) return true;
      return dateStr >= t.valid_from && dateStr <= t.valid_to;
    }) ?? seasonalTariffs[0] ?? null;
  };

  // Recalculated values when date changes
  const recalculated = useMemo(() => {
    if (!confirmBooking) return null;
    const ciStr = confirmBooking.check_in_date;
    const originalCoStr = confirmBooking.check_out_date;
    const newCoStr = format(actualCheckOutDate, "yyyy-MM-dd");

    const originalDays = calcDuration(ciStr, originalCoStr);
    const newDays = calcDuration(ciStr, newCoStr);

    const originalTotal = Number(confirmBooking.total_amount ?? 0);
    const dateChanged = newCoStr !== originalCoStr;

    const extraDays = Math.max(0, newDays - originalDays);
    let extraCost = 0;
    let extraTariffName = "";

    if (extraDays > 0) {
      const numCats = (confirmBooking.booking_cats ?? []).length;
      const tariff = findSeasonalTariff(newCoStr > originalCoStr ? originalCoStr : ciStr);
      if (tariff) {
        extraTariffName = tariff.name;
        const baseCost = Number(tariff.price_per_day) * extraDays * numCats;
        const extraCats = Math.max(0, numCats - 1);
        const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * extraDays;
        extraCost = Math.round((baseCost + supplementCost) * 100) / 100;
      }
    }

    const effectiveExtraCost = manualExtraCost !== null ? Math.max(0, parseFloat(manualExtraCost) || 0) : extraCost;

    // If fewer days: keep original total. If more days: add extra cost.
    const newTotal = newDays <= originalDays ? originalTotal : Math.round((originalTotal + effectiveExtraCost) * 100) / 100;

    return { newCoStr, originalDays, newDays, newTotal, dateChanged, originalTotal, extraDays, extraCost, extraTariffName, effectiveExtraCost };
  }, [confirmBooking, actualCheckOutDate, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs, manualExtraCost]);

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
    setManualExtraCost(null);
  };

  const openConfirm = async (b: any) => {
    setConfirmBooking(b);
    resetForm();
    setBookingPaidAmount(0);
    setActualCheckOutDate(parseISO(b.check_out_date));

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
    if (!booking || !recalculated) return;

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
      await updateCatRegistryCheckout.mutateAsync({
        bookingId: booking.id,
        checkOutDate: recalculated.newCoStr,
        reason: "Ritorno a casa",
      });

      // Also update microchip in registry rows
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

      // 3. Update booking date + total + transition to chiusa
      const bookingUpdates: any = { status: "chiusa" as const };
      if (recalculated.dateChanged) {
        bookingUpdates.check_out_date = recalculated.newCoStr;
        bookingUpdates.total_amount = recalculated.newTotal;
        if (recalculated.extraDays > 0) {
          const existingBreakdown = booking.price_breakdown ?? {};
          bookingUpdates.price_breakdown = {
            ...existingBreakdown,
            extra_days_info: {
              extra_days: recalculated.extraDays,
              num_cats: (booking.booking_cats ?? []).length,
              tariff_name: recalculated.extraTariffName,
              extra_cost: recalculated.effectiveExtraCost,
              reason: "check_out_posticipato",
            },
          };
        }
      }
      await supabase.from("bookings").update(bookingUpdates).eq("id", booking.id);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["preventivi"] });

      // 4. Create payment if enabled
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

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

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
                <CardContent className="flex items-center gap-4 p-4 pb-0">
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
                <BookingDrillDown booking={b} />
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

          {confirmBooking && recalculated && (
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
              </div>

              {/* Date picker for actual check-out date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data effettiva di check-out</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !actualCheckOutDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(actualCheckOutDate, "dd MMMM yyyy", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarWidget
                      mode="single"
                      selected={actualCheckOutDate}
                      onSelect={(d) => {
                        if (d) {
                          setActualCheckOutDate(d);
                          setDatePickerOpen(false);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {recalculated.dateChanged && (
                  <p className="text-xs text-muted-foreground">
                    Check-in: {format(parseISO(confirmBooking.check_in_date), "dd MMM yyyy", { locale: it })}
                    {" → "} Data originale uscita: {format(parseISO(confirmBooking.check_out_date), "dd MMM yyyy", { locale: it })}
                  </p>
                )}
              </div>

              {/* Days & totals recap */}
              <div className="rounded-md border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodo</span>
                  <span>
                    {format(parseISO(confirmBooking.check_in_date), "dd/MM/yyyy")} → {format(actualCheckOutDate, "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durata</span>
                  <span className="font-medium">
                    {recalculated.newDays} {stayLabel}
                    {recalculated.dateChanged && recalculated.newDays !== recalculated.originalDays && (
                      <span className="text-muted-foreground ml-1">(era {recalculated.originalDays})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Totale originale</span>
                  <span>€ {recalculated.originalTotal.toFixed(2)}</span>
                </div>
                {recalculated.extraDays > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-primary">
                      <span>+ {recalculated.extraDays} {stayLabel} extra ({recalculated.extraTariffName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Importo extra €</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-7 w-28 text-sm"
                        value={manualExtraCost !== null ? manualExtraCost : recalculated.extraCost.toFixed(2)}
                        onChange={e => setManualExtraCost(e.target.value)}
                      />
                      {manualExtraCost !== null && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline hover:text-foreground"
                          onClick={() => setManualExtraCost(null)}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {recalculated.dateChanged && recalculated.newDays < recalculated.originalDays && (
                  <div className="text-xs text-muted-foreground italic">
                    Soggiorno ridotto di {recalculated.originalDays - recalculated.newDays} {stayLabel} — totale invariato
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5">
                  <span className="font-medium">Nuovo totale</span>
                  <span className="font-bold">€ {recalculated.newTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagato</span>
                  <span>€ {bookingPaidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground font-medium">Residuo</span>
                  <span className={cn("font-bold", (recalculated.newTotal - bookingPaidAmount) > 0 ? "text-destructive" : "")}>
                    € {(recalculated.newTotal - bookingPaidAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Registry info */}
              <div className="rounded-md bg-muted/50 border p-3 text-sm">
                <p className="text-muted-foreground">
                  Il registro gatti verrà aggiornato con la data di check-out selezionata e motivazione <strong>"Ritorno a casa"</strong>.
                </p>
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
                                min="0"
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

              {/* Toggle for adding payment */}
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

          {recalculated && (() => {
            const pendingPayment = addPayment ? Math.max(0, parseFloat(txAmount) || 0) : 0;
            const remaining = recalculated.newTotal - bookingPaidAmount - pendingPayment;
            const hasBalance = remaining > 0.01;
            return (
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                {hasBalance && (
                  <p className="text-sm text-destructive text-center w-full">
                    Residuo di € {remaining.toFixed(2)} — registra un pagamento per procedere
                  </p>
                )}
                <div className="flex gap-2 justify-end w-full">
                  <Button variant="outline" onClick={() => setConfirmBooking(null)}>Annulla</Button>
                  <Button
                    variant="destructive"
                    onClick={handleCheckOut}
                    disabled={isSubmitting || hasBalance}
                  >
                    {isSubmitting ? "Elaborazione..." : "Conferma Check-out"}
                  </Button>
                </div>
              </DialogFooter>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
