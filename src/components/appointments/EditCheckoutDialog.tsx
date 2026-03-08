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

// Statuses that are considered "before check-in"
const PRE_CHECKIN_STATUSES = [
  "preventivo", "confermata",
  "appuntamento_fissato", "appuntamento_in_fissato",
  "appuntamento_out_fissato", "appuntamento_in_out_fissato",
];

export function EditCheckoutDialog({ open, onOpenChange, appointment, bookingData }: Props) {
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();
  const createAppointment = useCreateAppointment();
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();

  const isCreateMode = !appointment;
  const booking = appointment?.booking ?? bookingData;
  const appointmentType = appointment?.appointment_type ?? "check_out";
  const isCheckIn = appointmentType === "check_in";

  const originalCiDate = (booking as any)?.check_in_date;
  const originalCoDate = (booking as any)?.check_out_date;
  const bookingStatus = (booking as any)?.status ?? "";
  const isPreCheckIn = PRE_CHECKIN_STATUSES.includes(bookingStatus);

  // The date we're editing: check_in_date for check-in appts, check_out_date for check-out
  const originalDateStr = isCheckIn ? originalCiDate : originalCoDate;

  const [newDate, setNewDate] = useState<Date>(
    originalDateStr ? parseISO(originalDateStr) : new Date()
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [manualExtraCost, setManualExtraCost] = useState<string | null>(null);
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
      setNewDate(originalDateStr ? parseISO(originalDateStr) : new Date());
      setSelectedTime(isCreateMode ? "" : currentTime);
      setManualExtraCost(null);
    }
  }, [open, originalDateStr, currentTime, isCreateMode]);

  const newDateStr = format(newDate, "yyyy-MM-dd");
  const dateChanged = newDateStr !== originalDateStr;

  // Slot configs for the new date
  const jsDay = getDay(newDate);
  const dow = jsDay === 0 ? 6 : jsDay - 1;
  const { data: slotConfigs } = useSlotConfigsForDay(appointmentType, dow);
  const { data: counts } = useAppointmentCounts(newDateStr, appointmentType);

  const availableSlots = useMemo(() => {
    if (!slotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of slotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = counts?.[time] ?? 0;
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
    if (!booking || !originalCiDate || !originalCoDate) return null;

    // Compute effective check-in/check-out dates based on what we're editing
    const effectiveCi = isCheckIn ? newDateStr : originalCiDate;
    const effectiveCo = isCheckIn ? originalCoDate : newDateStr;

    const originalDays = calcDuration(originalCiDate, originalCoDate);
    const newDays = calcDuration(effectiveCi, effectiveCo);
    const originalTotal = Number((booking as any).total_amount ?? 0);

    const extraDays = Math.max(0, newDays - originalDays);
    const reducedDays = Math.max(0, originalDays - newDays);
    let extraCost = 0;
    let extraTariffName = "";

    if (extraDays > 0) {
      const numCats = ((booking as any).booking_cats ?? []).length;
      const tariff = findSeasonalTariff(effectiveCo > originalCoDate ? originalCoDate : effectiveCi);
      if (tariff) {
        extraTariffName = tariff.name;
        const baseCost = Number(tariff.price_per_day) * extraDays * numCats;
        const extraCats = Math.max(0, numCats - 1);
        const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * extraDays;
        extraCost = Math.round((baseCost + supplementCost) * 100) / 100;
      }
    }

    const effectiveExtraCost = manualExtraCost !== null ? Math.max(0, parseFloat(manualExtraCost) || 0) : extraCost;

    let newTotal: number;
    if (isPreCheckIn) {
      // Pre check-in: recalculate in both directions
      if (extraDays > 0) {
        newTotal = Math.round((originalTotal + effectiveExtraCost) * 100) / 100;
      } else if (reducedDays > 0) {
        // Reduce: recalculate from scratch based on new days
        const numCats = ((booking as any).booking_cats ?? []).length;
        const tariff = findSeasonalTariff(effectiveCi);
        if (tariff) {
          const baseCost = Number(tariff.price_per_day) * newDays * numCats;
          const extraCats = Math.max(0, numCats - 1);
          const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * newDays;
          newTotal = Math.round((baseCost + supplementCost) * 100) / 100;
        } else {
          newTotal = originalTotal;
        }
      } else {
        newTotal = originalTotal;
      }
    } else {
      // Post check-in: only increase, never decrease
      newTotal = extraDays > 0
        ? Math.round((originalTotal + effectiveExtraCost) * 100) / 100
        : originalTotal;
    }

    return { originalDays, newDays, newTotal, originalTotal, extraDays, reducedDays, extraCost, extraTariffName, effectiveExtraCost };
  }, [booking, originalCiDate, originalCoDate, newDateStr, isCheckIn, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs, manualExtraCost, isPreCheckIn]);

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  // Date constraints for the calendar
  const calendarDisabled = (d: Date) => {
    if (isCheckIn) {
      // Check-in can't be after check-out
      return originalCoDate ? d > parseISO(originalCoDate) : false;
    } else {
      // Check-out can't be before check-in
      return originalCiDate ? d < parseISO(originalCiDate) : false;
    }
  };

  const handleSave = async () => {
    if (!selectedTime) {
      toast.error(`Seleziona un orario per il ${isCheckIn ? "check-in" : "check-out"}`);
      return;
    }
    if (!booking) return;
    setSaving(true);
    try {
      const bookingId = (booking as any).id;

      if (isCreateMode) {
        const selectedSlot = availableSlots.find(s => s.time === selectedTime);
        await createAppointment.mutateAsync({
          booking_id: bookingId,
          appointment_type: appointmentType,
          scheduled_at: `${newDateStr}T${selectedTime}:00`,
          duration_minutes: selectedSlot?.duration ?? 30,
        });
      } else {
        await updateAppointment.mutateAsync({
          id: appointment!.id,
          scheduled_at: `${newDateStr}T${selectedTime}:00`,
        });
      }

      // Update booking dates and total if date changed
      if (dateChanged && recalculated) {
        const existingBreakdown = (booking as any).price_breakdown ?? {};
        const bookingUpdates: any = {};

        if (isCheckIn) {
          bookingUpdates.check_in_date = newDateStr;
        } else {
          bookingUpdates.check_out_date = newDateStr;
        }

        // Update total amount
        if (recalculated.newTotal !== recalculated.originalTotal) {
          bookingUpdates.total_amount = recalculated.newTotal;
        }

        // Add extra days info if days increased (post check-in only adds extras)
        if (recalculated.extraDays > 0 && !isPreCheckIn) {
          bookingUpdates.price_breakdown = {
            ...existingBreakdown,
            extra_days_info: {
              extra_days: recalculated.extraDays,
              num_cats: ((booking as any).booking_cats ?? []).length,
              tariff_name: recalculated.extraTariffName,
              extra_cost: recalculated.effectiveExtraCost,
              reason: isCheckIn ? "check_in_anticipato" : "check_out_posticipato",
            },
          };
        } else if (isPreCheckIn && recalculated.newTotal !== recalculated.originalTotal) {
          // Pre check-in: clean up extra_days_info if any, since we recalculate from scratch
          const { extra_days_info, ...restBreakdown } = existingBreakdown;
          bookingUpdates.price_breakdown = restBreakdown;
        }

        if (Object.keys(bookingUpdates).length > 0) {
          await supabase.from("bookings").update(bookingUpdates).eq("id", bookingId);
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["preventivi"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments-by-date"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments-by-range"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments-all"] }),
        queryClient.invalidateQueries({ queryKey: ["appointment-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["booking-appointments"] }),
      ]);

      const typeLabel = isCheckIn ? "check-in" : "check-out";
      toast.success(isCreateMode ? `Appuntamento ${typeLabel} creato` : `Appuntamento ${typeLabel} aggiornato`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const noChanges = !isCreateMode && !dateChanged && selectedTime === currentTime;
  const typeLabel = isCheckIn ? "Check-in" : "Check-out";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? `Fissa ${typeLabel}` : `Modifica ${typeLabel}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Booking info */}
          <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> {(booking as any)?.client?.first_name} {(booking as any)?.client?.last_name}</p>
            <p><span className="text-muted-foreground">Prenotazione:</span> <span className="font-mono">{(booking as any)?.booking_number}</span></p>
            <p><span className="text-muted-foreground">Check-in {isCheckIn ? (isCreateMode ? "previsto" : "originale") : ""}:</span> {originalCiDate ? format(parseISO(originalCiDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
            <p><span className="text-muted-foreground">Check-out {!isCheckIn ? (isCreateMode ? "previsto" : "originale") : ""}:</span> {originalCoDate ? format(parseISO(originalCoDate), "dd MMM yyyy", { locale: it }) : "—"}</p>
            <p><span className="text-muted-foreground">Stato:</span> {bookingStatus}</p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isCreateMode ? `Data di ${typeLabel.toLowerCase()}` : `Nuova data di ${typeLabel.toLowerCase()}`}
            </Label>
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
                  disabled={calendarDisabled}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slot selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Orario {typeLabel.toLowerCase()}</Label>
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
              {recalculated.reducedDays > 0 && isPreCheckIn && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Soggiorno ridotto di {recalculated.reducedDays} {stayLabel} — totale ricalcolato
                </div>
              )}
              {recalculated.reducedDays > 0 && !isPreCheckIn && (
                <div className="text-xs text-muted-foreground italic">
                  Soggiorno ridotto di {recalculated.reducedDays} {stayLabel} — totale invariato (check-in già effettuato)
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
            {saving ? "Salvataggio..." : isCreateMode ? `Fissa ${typeLabel}` : "Salva Modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}