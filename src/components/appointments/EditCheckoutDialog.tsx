import { useState, useMemo, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, getDay, addDays } from "date-fns";
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
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useOccupancyData } from "@/components/OccupancyGrid";
import type { Booking } from "@/hooks/useBookings";
import { generateModuloAffidoPDF } from "@/lib/generateModuloAffidoPDF";

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
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();
  const createAppointment = useCreateAppointment();
  const { data: tenantConfig } = useTenantConfig();
  const { data: priceLists } = usePriceLists();
  const { profile } = useAuth();

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
  const [emailConfirmPhase, setEmailConfirmPhase] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const savedRef = useRef<{ date: string; time: string }>({ date: "", time: "" });

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
      setEmailConfirmPhase(false);
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

  // Auto-select first available slot only in create mode
  useEffect(() => {
    if (isCreateMode && availableSlots.length > 0 && !selectedTime) {
      const firstAvailable = availableSlots.find(s => s.available > 0);
      if (firstAvailable) setSelectedTime(firstAvailable.time);
    }
  }, [availableSlots, selectedTime, isCreateMode]);

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

  const isInCorso = (booking as any)?.status === "in_corso";

  const recalculated = useMemo(() => {
    if (!booking || !checkInDate || !originalCoDate) return null;

    const originalDays = calcDuration(checkInDate, originalCoDate);
    const newDays = calcDuration(checkInDate, newDateStr);
    const originalTotal = Number((booking as any).total_amount ?? 0);

    if (newDays <= 0) return { originalDays, newDays, newTotal: originalTotal, originalTotal, valid: false };

    const numCats = ((booking as any).booking_cats ?? []).length || 1;
    const tariff = findSeasonalTariff(checkInDate);
    let newTotal = originalTotal;

    // Per prenotazioni in corso: anticipo checkout = totale invariato, posticipo = ricalcolo
    if (isInCorso && newDateStr < originalCoDate) {
      newTotal = originalTotal;
    } else if (tariff && newDays !== originalDays) {
      const baseCost = Number(tariff.price_per_day) * newDays * numCats;
      const extraCats = Math.max(0, numCats - 1);
      const supplementCost = extraCats * Number(tariff.extra_cat_supplement ?? 0) * newDays;
      newTotal = Math.round((baseCost + supplementCost) * 100) / 100;
    }

    return { originalDays, newDays, newTotal, originalTotal, valid: true };
  }, [booking, checkInDate, originalCoDate, newDateStr, stayCalcType, countCheckinDay, countCheckoutDay, seasonalTariffs, isInCorso]);

  // --- Availability check ---
  const { data: allBookings } = useQuery({
    queryKey: ["bookings-availability", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, client:clients(id, first_name, last_name, email, phone), booking_cats(id, cat_id, cat:cats(id, name))`)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "cancellata")
        .neq("status", "rimborsata")
        .neq("status", "scaduto");
      if (error) throw error;
      return data as unknown as Booking[];
    },
    enabled: !!profile?.tenant_id && open && dateChanged,
  });

  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 4;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;
  const totalSingole = petType === "entrambi"
    ? ((tenantConfig as any)?.[`num_singole_${(booking as any)?.pet_type ?? "gatti"}`] ?? tenantConfig?.num_singole ?? 0)
    : (tenantConfig?.num_singole ?? 0);
  const totalDoppie = petType === "entrambi"
    ? ((tenantConfig as any)?.[`num_doppie_${(booking as any)?.pet_type ?? "gatti"}`] ?? tenantConfig?.num_doppie ?? 0)
    : (tenantConfig?.num_doppie ?? 0);

  const bookingCageType = (booking as any)?.cage_pool_type ?? "singola";
  const bookingId = (booking as any)?.id;
  const { bookingOccupancy } = useOccupancyData(
    allBookings ?? [], occupancyDays, bookingId, petType
  );

  const availabilityResult = useMemo(() => {
    if (!dateChanged || !allBookings) return null;
    const total = bookingCageType === "singola" ? totalSingole : totalDoppie;
    const bookingPetType = (booking as any)?.pet_type;
    const isDog = bookingPetType === "cani";
    const ciDate = checkInDate ? parseISO(checkInDate) : new Date();
    const newCoDate = parseISO(newDateStr);
    const stayDays = Math.ceil((newCoDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysToCheck = isDog ? stayDays : Math.min(occupancyDays, stayDays);

    let maxOccupied = 0;
    for (let i = 0; i < daysToCheck; i++) {
      const dateStr = format(addDays(ciDate, i), "yyyy-MM-dd");
      let occupied = 0;
      for (const bo of bookingOccupancy) {
        if (bo.occupiedDates.has(dateStr) && bo.booking.cage_pool_type === bookingCageType) {
          occupied += bo.booking.units_occupied;
        }
      }
      maxOccupied = Math.max(maxOccupied, occupied);
    }
    const free = Math.max(0, total - maxOccupied);
    return { free, total, available: free > 0 };
  }, [dateChanged, allBookings, bookingOccupancy, newDateStr, checkInDate, bookingCageType, totalSingole, totalDoppie, occupancyDays, booking]);

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
          price_breakdown: {
            ...existingBreakdown,
            checkout_date_change: {
              original_date: originalCoDate,
              new_date: newDateStr,
              original_days: recalculated.originalDays,
              new_days: recalculated.newDays,
              original_total: recalculated.originalTotal,
              new_total: recalculated.newTotal,
            },
          },
        };
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
      savedRef.current = { date: newDateStr, time: selectedTime };
      if ((booking as any)?.client?.email && tenantConfig) {
        setEmailConfirmPhase(true);
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!booking || !tenantConfig) return;
    setSendingEmail(true);
    try {
      const { date, time } = savedRef.current;
      const bookingWithAppts = {
        ...booking,
        check_out_date: date,
        appointments: [
          ...((booking as any).appointments ?? []).filter((a: any) => a.appointment_type !== "check_out"),
          { id: "upd-out", appointment_type: "check_out" as const, scheduled_at: `${date}T${time}:00` },
        ],
      };
      const pdf_base64 = await generateModuloAffidoPDF(bookingWithAppts as any, tenantConfig as any, true, supabase) as string;
      const { data, error } = await supabase.functions.invoke("send-appuntamento", {
        body: { booking_id: (booking as any).id, pdf_base64, filename: `Modulo_Affido_${(booking as any).booking_number}.pdf` },
      });
      if (error || data?.error) throw new Error((error || data?.error)?.message || "Errore invio");
      toast.success(`Email inviata a ${(booking as any).client?.email}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio email");
    } finally {
      setSendingEmail(false);
      setEmailConfirmPhase(false);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setEmailConfirmPhase(false);
    onOpenChange(false);
  };

  const noChanges = !isCreateMode && !dateChanged && selectedTime === currentTime;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? "Fissa Check-out" : "Modifica Check-out"}</DialogTitle>
        </DialogHeader>

        {emailConfirmPhase ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/40">
              <Mail className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Inviare la mail al cliente?</p>
                <p className="text-sm text-muted-foreground">
                  Vuoi inviare a <strong>{(booking as any)?.client?.email}</strong> la conferma degli appuntamenti con il modulo di affido in allegato?
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sendingEmail}>No, chiudi</Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? "Invio in corso..." : "Sì, invia email"}
              </Button>
            </DialogFooter>
          </div>
        ) : (

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

          {/* Availability check */}
          {dateChanged && availabilityResult && (
            <Alert className={cn(
              availabilityResult.available
                ? "border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            )}>
              {availabilityResult.available ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="ml-2 text-sm font-medium">
                {availabilityResult.available
                  ? `Disponibile: ${availabilityResult.free} casett${availabilityResult.free === 1 ? "a" : "e"} ${bookingCageType === "singola" ? "singol" + (availabilityResult.free === 1 ? "a" : "e") : "doppi" + (availabilityResult.free === 1 ? "a" : "e")} liber${availabilityResult.free === 1 ? "a" : "e"}.`
                  : `⚠️ Nessuna casetta ${bookingCageType === "singola" ? "singola" : "doppia"} disponibile nel periodo. Tutte le ${availabilityResult.total} casette sono occupate.`
                }
              </AlertDescription>
            </Alert>
          )}
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
              La data di check-out non può essere uguale o precedente al check-in.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || noChanges || !selectedTime || (recalculated && !recalculated.valid)}>
              {saving ? "Salvataggio..." : isCreateMode ? "Fissa Check-out" : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
