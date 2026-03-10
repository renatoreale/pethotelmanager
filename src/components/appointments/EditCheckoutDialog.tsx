import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useSlotConfigsForDay,
  useAppointmentCounts,
  useUpdateAppointment,
  useCreateAppointment,
  generateTimeSlots,
  type AppointmentWithDetails,
} from "@/hooks/useAppointments";
import { useTenantConfig, usePriceLists } from "@/hooks/usePensioneConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/** Booking-only data for create mode */
export interface CheckoutBookingData {
  id: string;
  booking_number: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number | null;
  client?: {
    first_name: string;
    last_name: string;
  };
  booking_cats?: { id: string; cat?: { id: string; name: string } }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing appointment (edit mode) */
  appointment?: AppointmentWithDetails | null;
  /** Booking data for create mode (when no checkout appointment exists) */
  bookingData?: CheckoutBookingData | null;
}

export function EditCheckoutDialog({ open, onOpenChange, appointment, bookingData }: Props) {
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();
  const createAppointment = useCreateAppointment();
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();

  const isCreateMode = !appointment;
  const booking = appointment?.booking ?? bookingData;
  const originalCoDate = (booking as any)?.check_out_date;
  const checkInDate = (booking as any)?.check_in_date;

  const [newDate, setNewDate] = useState<Date>(
    originalCoDate ? parseISO(originalCoDate) : new Date()
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Extract current time from appointment (edit mode only)
  const currentTime = useMemo(() => {
    if (!appointment) return "";
    const tIndex = appointment.scheduled_at.indexOf("T");
    return tIndex >= 0 ? appointment.scheduled_at.slice(tIndex + 1, tIndex + 6) : "";
  }, [appointment]);

  // Init state when dialog opens
  useEffect(() => {
    if (open) {
      setNewDate(originalCoDate ? parseISO(originalCoDate) : new Date());
      setSelectedTime(isCreateMode ? "" : currentTime);
    }
  }, [open, originalCoDate, currentTime, isCreateMode]);

  const newDateStr = format(newDate, "yyyy-MM-dd");
  const dateChanged = newDateStr !== originalCoDate;

  // Slot configs for the new date
  const jsDay = getDay(newDate);
  const dow = jsDay === 0 ? 6 : jsDay - 1;
  const { data: slotConfigs } = useSlotConfigsForDay("check_out", dow);
  const { data: counts } = useAppointmentCounts(newDateStr, "check_out");

  const availableSlots = useMemo(() => {
    if (!slotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of slotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = counts?.[time] ?? 0;
        // Don't count current appointment as used if same date (edit mode)
        if (!isCreateMode && !dateChanged && time === currentTime) used = Math.max(0, used - 1);
        slots.push({
          time,
          available: config.max_appointments - used,
          maxAppts: config.max_appointments,
          duration: config.slot_duration_minutes,
        });
      }
    }
    return slots;
  }, [slotConfigs, counts, currentTime, dateChanged, isCreateMode]);

  // Auto-select first available slot in create mode
  useEffect(() => {
    if (availableSlots.length > 0 && !selectedTime) {
      const firstAvailable = availableSlots.find(s => s.available > 0);
      if (firstAvailable) setSelectedTime(firstAvailable.time);
    }
  }, [availableSlots, selectedTime]);

  // Reset time selection when date changes and current time is not available
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
    if (!booking || !checkInDate || !originalCoDate) return null;

    const originalDays = calcDuration(checkInDate, originalCoDate);
    const newDays = calcDuration(checkInDate, newDateStr);
    const originalTotal = Number((booking as any).total_amount ?? 0);

    if (newDays <= 0) return { originalDays, newDays, newTotal: originalTotal, originalTotal, valid: false };

    // Full recalculation based on new duration (same logic as check-in)
    const numCats = ((booking as any).booking_cats ?? []).length || 1;
    const tariff = findSeasonalTariff(checkInDate);
    let newTotal = originalTotal;

    if (tariff && newDays !== originalDays) {
      const baseCost = Number(tariff.price_per_day) * newDays * numCats;
      const extraCats = Math.max(0, numCats - 1);
      const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * newDays;
      newTotal = Math.round((baseCost + supplementCost) * 100) / 100;
    }

    return { originalDays, newDays, newTotal, originalTotal, valid: true };
  }, [booking, checkInDate, originalCoDate, newDateStr, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs]);

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  const handleSave = async () => {
    if (!selectedTime) {
      toast.error("Seleziona un orario per il check-out");
      return;
    }
    if (!booking) return;
    setSaving(true);
    try {
      const bookingId = (booking as any).id;

      if (isCreateMode) {
        // Create new checkout appointment
        const selectedSlot = availableSlots.find(s => s.time === selectedTime);
        await createAppointment.mutateAsync({
          booking_id: bookingId,
          appointment_type: "check_out",
          scheduled_at: `${newDateStr}T${selectedTime}:00`,
          duration_minutes: selectedSlot?.duration ?? 30,
        });
      } else {
        // Update existing appointment
        await updateAppointment.mutateAsync({
          id: appointment!.id,
          scheduled_at: `${newDateStr}T${selectedTime}:00`,
        });
      }

      // Update booking check_out_date and total if date changed
      if (dateChanged && recalculated) {
        const existingBreakdown = (booking as any).price_breakdown ?? {};
        const bookingUpdates: any = {
          check_out_date: newDateStr,
          total_amount: recalculated.newTotal,
        };
        if (recalculated.extraDays > 0) {
          bookingUpdates.price_breakdown = {
            ...existingBreakdown,
            extra_days_info: {
              extra_days: recalculated.extraDays,
              num_cats: ((booking as any).booking_cats ?? []).length,
              tariff_name: recalculated.extraTariffName,
              extra_cost: recalculated.effectiveExtraCost,
              reason: "check_out_posticipato",
            },
          };
        }
        await supabase.from("bookings").update(bookingUpdates).eq("id", bookingId);
      }

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["preventivi"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-by-date"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-by-range"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-all"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-counts"] });
      queryClient.invalidateQueries({ queryKey: ["booking-appointments"] });

      toast.success(isCreateMode ? "Appuntamento check-out creato" : "Appuntamento check-out aggiornato");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const noChanges = !isCreateMode && !dateChanged && selectedTime === currentTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? "Fissa Check-out" : "Modifica Check-out"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Booking info */}
          <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> {(booking as any)?.client?.first_name} {(booking as any)?.client?.last_name}</p>
            <p><span className="text-muted-foreground">Prenotazione:</span> <span className="font-mono">{(booking as any)?.booking_number}</span></p>
            <p><span className="text-muted-foreground">Check-in:</span> {checkInDate ? format(parseISO(checkInDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
            <p><span className="text-muted-foreground">Check-out {isCreateMode ? "previsto" : "originale"}:</span> {originalCoDate ? format(parseISO(originalCoDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{isCreateMode ? "Data di check-out" : "Nuova data di check-out"}</Label>
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
                  disabled={(d) => checkInDate ? d < parseISO(checkInDate) : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slot selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Orario check-out</Label>
            {!availableSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isCurrent = !isCreateMode && !dateChanged && slot.time === currentTime;
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
          {dateChanged && recalculated && (
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
              {recalculated.extraDays > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-primary">
                    <span>+ {recalculated.extraDays} {stayLabel} extra {recalculated.extraTariffName && `(${recalculated.extraTariffName})`}</span>
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
              {recalculated.newDays < recalculated.originalDays && (
                <div className="text-xs text-muted-foreground italic">
                  Soggiorno ridotto di {recalculated.originalDays - recalculated.newDays} {stayLabel} — totale invariato
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-medium">Nuovo totale</span>
                <span className="font-bold">€ {recalculated.newTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving || noChanges || !selectedTime}>
            {saving ? "Salvataggio..." : isCreateMode ? "Fissa Check-out" : "Salva Modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
