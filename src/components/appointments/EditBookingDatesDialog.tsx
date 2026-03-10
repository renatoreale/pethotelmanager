import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTenantConfig, usePriceLists } from "@/hooks/usePensioneConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface BookingData {
  id: string;
  booking_number: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  price_breakdown: any;
  status?: string;
  client?: { first_name: string; last_name: string };
  booking_cats?: { id: string; cat?: { id: string; name: string } }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingData;
}

export function EditBookingDatesDialog({ open, onOpenChange, booking }: Props) {
  const queryClient = useQueryClient();
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();

  const [newCiDate, setNewCiDate] = useState<Date>(parseISO(booking.check_in_date));
  const [newCoDate, setNewCoDate] = useState<Date>(parseISO(booking.check_out_date));
  const [ciPickerOpen, setCiPickerOpen] = useState(false);
  const [coPickerOpen, setCoPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNewCiDate(parseISO(booking.check_in_date));
      setNewCoDate(parseISO(booking.check_out_date));
    }
  }, [open, booking.check_in_date, booking.check_out_date]);

  const newCiStr = format(newCiDate, "yyyy-MM-dd");
  const newCoStr = format(newCoDate, "yyyy-MM-dd");
  const ciChanged = newCiStr !== booking.check_in_date;
  const coChanged = newCoStr !== booking.check_out_date;
  const anyChange = ciChanged || coChanged;

  // Pricing
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

  const isInCorso = booking.status === "in_corso";

  const recalculated = useMemo(() => {
    const originalDays = calcDuration(booking.check_in_date, booking.check_out_date);
    const newDays = calcDuration(newCiStr, newCoStr);
    const originalTotal = Number(booking.total_amount ?? 0);

    if (newDays <= 0) return { originalDays, newDays, newTotal: originalTotal, originalTotal, valid: false };

    const numCats = (booking.booking_cats ?? []).length || 1;
    const tariff = findSeasonalTariff(newCiStr);
    let newTotal = originalTotal;

    // Per prenotazioni in corso: se si anticipa il checkout, il totale resta invariato
    if (isInCorso && newCoStr < booking.check_out_date) {
      newTotal = originalTotal;
    } else if (tariff && newDays !== originalDays) {
      const baseCost = Number(tariff.price_per_day) * newDays * numCats;
      const extraCats = Math.max(0, numCats - 1);
      const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * newDays;
      newTotal = Math.round((baseCost + supplementCost) * 100) / 100;
    }

    return { originalDays, newDays, newTotal, originalTotal, valid: true };
  }, [booking, newCiStr, newCoStr, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs, isInCorso]);

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  const handleSave = async () => {
    if (recalculated && !recalculated.valid) {
      toast.error("La data di check-in deve essere precedente al check-out");
      return;
    }
    setSaving(true);
    try {
      const existingBreakdown = booking.price_breakdown ?? {};
      const updates: any = {};
      if (ciChanged) updates.check_in_date = newCiStr;
      if (coChanged) updates.check_out_date = newCoStr;
      if (recalculated) {
        updates.total_amount = recalculated.newTotal;
        updates.price_breakdown = {
          ...existingBreakdown,
          date_change: {
            original_checkin: booking.check_in_date,
            original_checkout: booking.check_out_date,
            new_checkin: newCiStr,
            new_checkout: newCoStr,
            original_days: recalculated.originalDays,
            new_days: recalculated.newDays,
            original_total: recalculated.originalTotal,
            new_total: recalculated.newTotal,
          },
        };
      }

      const { error } = await supabase.from("bookings").update(updates).eq("id", booking.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["preventivi"] });

      toast.success("Date prenotazione aggiornate");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Date Prenotazione</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Booking info */}
          <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> {booking.client?.first_name} {booking.client?.last_name}</p>
            <p><span className="text-muted-foreground">Prenotazione:</span> <span className="font-mono">{booking.booking_number}</span></p>
            <p><span className="text-muted-foreground">Check-in attuale:</span> {format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: it })}</p>
            <p><span className="text-muted-foreground">Check-out attuale:</span> {format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: it })}</p>
            <p><span className="text-muted-foreground">Totale attuale:</span> € {Number(booking.total_amount ?? 0).toFixed(2)}</p>
          </div>

          {/* Check-in date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Check-in</Label>
            <Popover open={ciPickerOpen} onOpenChange={setCiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", ciChanged && "border-primary")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newCiDate, "EEEE dd MMMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  selected={newCiDate}
                  onSelect={(d) => { if (d) { setNewCiDate(d); setCiPickerOpen(false); } }}
                  disabled={(d) => {
                    if (d < today) return true;
                    if (d >= newCoDate) return true;
                    return false;
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Check-out</Label>
            <Popover open={coPickerOpen} onOpenChange={setCoPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", coChanged && "border-primary")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newCoDate, "EEEE dd MMMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  selected={newCoDate}
                  onSelect={(d) => { if (d) { setNewCoDate(d); setCoPickerOpen(false); } }}
                  disabled={(d) => d <= newCiDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Pricing recalculation */}
          {anyChange && recalculated && recalculated.valid && (
            <div className="rounded-md border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durata</span>
                <span className="font-medium">
                  {recalculated.newDays} {stayLabel}
                  {recalculated.newDays !== recalculated.originalDays && (
                    <span className="text-muted-foreground ml-1">(era {recalculated.originalDays})</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totale originale</span>
                <span>€ {recalculated.originalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-medium">Nuovo totale</span>
                <span className={cn("font-bold", recalculated.newTotal !== recalculated.originalTotal && "text-primary")}>
                  € {recalculated.newTotal.toFixed(2)}
                </span>
              </div>
              {recalculated.newTotal !== recalculated.originalTotal && (
                <div className="text-xs text-muted-foreground italic">
                  {recalculated.newDays > recalculated.originalDays
                    ? `+${recalculated.newDays - recalculated.originalDays} ${stayLabel} — totale ricalcolato`
                    : `−${recalculated.originalDays - recalculated.newDays} ${stayLabel} — totale ricalcolato`
                  }
                </div>
              )}
            </div>
          )}

          {anyChange && recalculated && !recalculated.valid && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              La data di check-in non può essere uguale o successiva al check-out.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !anyChange || (recalculated && !recalculated.valid)}
          >
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
