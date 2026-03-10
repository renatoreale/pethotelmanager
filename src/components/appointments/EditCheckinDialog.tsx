import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, getDay, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useSlotConfigsForDay,
  useAppointmentCounts,
  useUpdateAppointment,
  generateTimeSlots,
  type AppointmentWithDetails,
} from "@/hooks/useAppointments";
import { useTenantConfig, usePriceLists } from "@/hooks/usePensioneConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useOccupancyData } from "@/components/OccupancyGrid";
import type { Booking } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithDetails;
}

export function EditCheckinDialog({ open, onOpenChange, appointment }: Props) {
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();
  const { profile } = useAuth();

  const booking = appointment.booking;
  const originalCiDate = booking?.check_in_date;
  const checkOutDate = booking?.check_out_date;

  const [newDate, setNewDate] = useState<Date>(
    originalCiDate ? parseISO(originalCiDate) : new Date()
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Extract current time
  const currentTime = useMemo(() => {
    const tIndex = appointment.scheduled_at.indexOf("T");
    return tIndex >= 0 ? appointment.scheduled_at.slice(tIndex + 1, tIndex + 6) : "";
  }, [appointment]);

  // Init state when dialog opens
  useEffect(() => {
    if (open) {
      setNewDate(originalCiDate ? parseISO(originalCiDate) : new Date());
      setSelectedTime(currentTime);
    }
  }, [open, originalCiDate, currentTime]);

  const newDateStr = format(newDate, "yyyy-MM-dd");
  const dateChanged = newDateStr !== originalCiDate;

  // Slot configs for the new date
  const jsDay = getDay(newDate);
  const dow = jsDay === 0 ? 6 : jsDay - 1;
  const { data: slotConfigs } = useSlotConfigsForDay("check_in", dow);
  const { data: counts } = useAppointmentCounts(newDateStr, "check_in");

  const availableSlots = useMemo(() => {
    if (!slotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of slotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = counts?.[time] ?? 0;
        // Don't count current appointment as used if same date
        if (!dateChanged && time === currentTime) used = Math.max(0, used - 1);
        slots.push({
          time,
          available: config.max_appointments - used,
          maxAppts: config.max_appointments,
          duration: config.slot_duration_minutes,
        });
      }
    }
    return slots;
  }, [slotConfigs, counts, currentTime, dateChanged]);

  // Reset time selection when date changes
  useEffect(() => {
    if (dateChanged && availableSlots.length > 0) {
      const hasCurrentTime = availableSlots.some(s => s.time === selectedTime && s.available > 0);
      if (!hasCurrentTime) {
        const firstAvailable = availableSlots.find(s => s.available > 0);
        if (firstAvailable) setSelectedTime(firstAvailable.time);
      }
    }
  }, [dateChanged, availableSlots, selectedTime]);

  // Pricing recalculation
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

  const recalculated = useMemo(() => {
    if (!booking || !originalCiDate || !checkOutDate) return null;

    const originalDays = calcDuration(originalCiDate, checkOutDate);
    const newDays = calcDuration(newDateStr, checkOutDate);
    const originalTotal = Number(booking.total_amount ?? 0);

    if (newDays <= 0) return { originalDays, newDays, newTotal: originalTotal, originalTotal, valid: false };

    // Recalculate full price based on new duration
    const numCats = (booking.booking_cats ?? []).length || 1;
    const tariff = findSeasonalTariff(newDateStr);
    let newTotal = originalTotal;

    if (tariff && newDays !== originalDays) {
      const baseCost = Number(tariff.price_per_day) * newDays * numCats;
      const extraCats = Math.max(0, numCats - 1);
      const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * newDays;
      newTotal = Math.round((baseCost + supplementCost) * 100) / 100;
    }

    return { originalDays, newDays, newTotal, originalTotal, valid: true };
  }, [booking, originalCiDate, checkOutDate, newDateStr, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs]);

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  const handleSave = async () => {
    if (!selectedTime || !booking) return;
    if (recalculated && !recalculated.valid) {
      toast.error("La data di check-in deve essere precedente al check-out");
      return;
    }
    setSaving(true);
    try {
      // Update appointment date and time
      await updateAppointment.mutateAsync({
        id: appointment.id,
        scheduled_at: `${newDateStr}T${selectedTime}:00`,
      });

      // Update booking check_in_date and total if date changed
      if (dateChanged && recalculated) {
        const existingBreakdown = (booking as any).price_breakdown ?? {};
        const bookingUpdates: any = {
          check_in_date: newDateStr,
          total_amount: recalculated.newTotal,
          price_breakdown: {
            ...existingBreakdown,
            checkin_date_change: {
              original_date: originalCiDate,
              new_date: newDateStr,
              original_days: recalculated.originalDays,
              new_days: recalculated.newDays,
              original_total: recalculated.originalTotal,
              new_total: recalculated.newTotal,
            },
          },
        };
        await supabase.from("bookings").update(bookingUpdates).eq("id", booking.id);
      }

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["preventivi"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-by-date"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-by-range"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-all"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-counts"] });
      queryClient.invalidateQueries({ queryKey: ["booking-appointments"] });

      toast.success("Appuntamento check-in aggiornato");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const noChanges = !dateChanged && selectedTime === currentTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica Check-in</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Booking info */}
          <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> {booking?.client?.first_name} {booking?.client?.last_name}</p>
            <p><span className="text-muted-foreground">Prenotazione:</span> <span className="font-mono">{booking?.booking_number}</span></p>
            <p><span className="text-muted-foreground">Check-in originale:</span> {originalCiDate ? format(parseISO(originalCiDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
            <p><span className="text-muted-foreground">Check-out:</span> {checkOutDate ? format(parseISO(checkOutDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
            <p><span className="text-muted-foreground">Orario attuale:</span> <span className="font-mono font-semibold">{currentTime}</span></p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nuova data di check-in</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    dateChanged && "border-primary"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newDate, "EEEE dd MMMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  selected={newDate}
                  onSelect={(d) => { if (d) { setNewDate(d); setDatePickerOpen(false); } }}
                  disabled={(d) => {
                    // Can't be after check-out date
                    if (checkOutDate && d >= parseISO(checkOutDate)) return true;
                    // Can't be in the past
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (d < today) return true;
                    return false;
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slot selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Orario check-in</Label>
            {!availableSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isCurrent = !dateChanged && slot.time === currentTime;
                  return (
                    <Button
                      key={slot.time}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      disabled={slot.available <= 0 && !isCurrent}
                      onClick={() => setSelectedTime(slot.time)}
                      className="relative gap-1.5"
                    >
                      {slot.time}
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">attuale</Badge>
                      )}
                      {!isCurrent && slot.available <= 0 && (
                        <span className="ml-1 text-xs">(pieno)</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing recalculation */}
          {dateChanged && recalculated && recalculated.valid && (
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

          {dateChanged && recalculated && !recalculated.valid && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              La data di check-in non può essere uguale o successiva al check-out.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button
            onClick={handleSave}
            disabled={saving || noChanges || !selectedTime || (recalculated && !recalculated.valid)}
          >
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
