import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format, parseISO, getDay, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, Clock, Info, MapPin, CreditCard, Calendar } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateTimeSlots } from "@/hooks/useAppointments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  tenantId: string;
}

// Client-side hooks for slot configs (by tenant_id, not useAuth)
function useClientSlotConfigsForDay(tenantId: string | undefined, appointmentType: "check_in" | "check_out", dayOfWeek: number | undefined) {
  return useQuery({
    queryKey: ["client-slot-configs", tenantId, appointmentType, dayOfWeek],
    queryFn: async () => {
      if (!tenantId || dayOfWeek === undefined) return [];
      const { data, error } = await supabase
        .from("slot_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.appointment_type === appointmentType);
    },
    enabled: !!tenantId && dayOfWeek !== undefined,
  });
}

function useClientAppointmentCounts(tenantId: string | undefined, date: string | undefined, appointmentType: "check_in" | "check_out") {
  return useQuery({
    queryKey: ["client-appt-counts", tenantId, date, appointmentType],
    queryFn: async () => {
      if (!tenantId || !date) return {};
      const { data, error } = await supabase.rpc("get_appointment_slot_counts", {
        _tenant_id: tenantId,
        _date: date,
        _appointment_type: appointmentType,
      });
      if (error) throw error;
      // data is a JSONB object like { "15:00": 2, "15:30": 1 }
      return (data as Record<string, number>) ?? {};
    },
    enabled: !!tenantId && !!date,
  });
}

export function ClienteBookingDetailDialog({ open, onOpenChange, booking, tenantId }: Props) {
  const supabase = useSupabase();
  const [scheduleMode, setScheduleMode] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const bookingId = booking?.id;
  const checkInDate = booking?.check_in_date;
  const checkOutDate = booking?.check_out_date;

  // Fetch existing appointments for this booking
  const { data: existingAppointments } = useQuery({
    queryKey: ["client-booking-appointments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && open,
  });

  const existingCheckIn = useMemo(() => {
    const appt = (existingAppointments ?? []).find((a: any) => a.appointment_type === "check_in");
    if (!appt) return null;
    const tIndex = appt.scheduled_at.indexOf("T");
    return { id: appt.id, time: tIndex >= 0 ? appt.scheduled_at.slice(tIndex + 1, tIndex + 6) : null };
  }, [existingAppointments]);

  const existingCheckOut = useMemo(() => {
    const appt = (existingAppointments ?? []).find((a: any) => a.appointment_type === "check_out");
    if (!appt) return null;
    const tIndex = appt.scheduled_at.indexOf("T");
    return { id: appt.id, time: tIndex >= 0 ? appt.scheduled_at.slice(tIndex + 1, tIndex + 6) : null };
  }, [existingAppointments]);

  const hasAppointments = !!(existingCheckIn || existingCheckOut);

  useEffect(() => {
    if (open) {
      setScheduleMode(false);
      setCheckInTime(existingCheckIn?.time ?? null);
      setCheckOutTime(existingCheckOut?.time ?? null);
    }
  }, [open, existingCheckIn?.time, existingCheckOut?.time]);

  // Slot config hooks
  const checkInDow = useMemo(() => {
    if (!checkInDate) return undefined;
    const jsDay = getDay(parseISO(checkInDate));
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [checkInDate]);

  const checkOutDow = useMemo(() => {
    if (!checkOutDate) return undefined;
    const jsDay = getDay(parseISO(checkOutDate));
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [checkOutDate]);

  const { data: checkInSlotConfigs } = useClientSlotConfigsForDay(tenantId, "check_in", checkInDow);
  const { data: checkOutSlotConfigs } = useClientSlotConfigsForDay(tenantId, "check_out", checkOutDow);
  const { data: checkInCounts } = useClientAppointmentCounts(tenantId, checkInDate, "check_in");
  const { data: checkOutCounts } = useClientAppointmentCounts(tenantId, checkOutDate, "check_out");

  const checkInSlots = useMemo(() => {
    if (!checkInSlotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of checkInSlotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = checkInCounts?.[time] ?? 0;
        if (existingCheckIn?.time === time) used = Math.max(0, used - 1);
        slots.push({ time, available: config.max_appointments - used, maxAppts: config.max_appointments, duration: config.slot_duration_minutes });
      }
    }
    return slots;
  }, [checkInSlotConfigs, checkInCounts, existingCheckIn?.time]);

  const checkOutSlots = useMemo(() => {
    if (!checkOutSlotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of checkOutSlotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = checkOutCounts?.[time] ?? 0;
        if (existingCheckOut?.time === time) used = Math.max(0, used - 1);
        slots.push({ time, available: config.max_appointments - used, maxAppts: config.max_appointments, duration: config.slot_duration_minutes });
      }
    }
    return slots;
  }, [checkOutSlotConfigs, checkOutCounts, existingCheckOut?.time]);

  // Can the client schedule appointments?
  const canSchedule = booking && ["confermata", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato"].includes(booking.status);

  const handleSaveAppointments = async () => {
    if (!booking || !tenantId) return;
    if (!checkInTime && !checkOutTime) {
      toast.error("Seleziona almeno un orario");
      return;
    }
    setSaving(true);
    try {
      // Handle check-in
      if (checkInTime && checkInDate) {
        if (existingCheckIn && checkInTime !== existingCheckIn.time) {
          await supabase.from("appointments").update({ scheduled_at: `${checkInDate}T${checkInTime}:00` }).eq("id", existingCheckIn.id);
        } else if (!existingCheckIn) {
          const selectedSlot = checkInSlots.find(s => s.time === checkInTime);
          await supabase.from("appointments").insert({
            booking_id: booking.id,
            tenant_id: tenantId,
            appointment_type: "check_in" as any,
            scheduled_at: `${checkInDate}T${checkInTime}:00`,
            duration_minutes: selectedSlot?.duration ?? 30,
          });
        }
      } else if (!checkInTime && existingCheckIn) {
        await supabase.from("appointments").delete().eq("id", existingCheckIn.id);
      }

      // Handle check-out
      if (checkOutTime && checkOutDate) {
        if (existingCheckOut && checkOutTime !== existingCheckOut.time) {
          await supabase.from("appointments").update({ scheduled_at: `${checkOutDate}T${checkOutTime}:00` }).eq("id", existingCheckOut.id);
        } else if (!existingCheckOut) {
          const selectedSlot = checkOutSlots.find(s => s.time === checkOutTime);
          await supabase.from("appointments").insert({
            booking_id: booking.id,
            tenant_id: tenantId,
            appointment_type: "check_out" as any,
            scheduled_at: `${checkOutDate}T${checkOutTime}:00`,
            duration_minutes: selectedSlot?.duration ?? 30,
          });
        }
      } else if (!checkOutTime && existingCheckOut) {
        await supabase.from("appointments").delete().eq("id", existingCheckOut.id);
      }

      // Update booking status
      const hasIn = !!checkInTime;
      const hasOut = !!checkOutTime;
      let newStatus: string;
      if (hasIn && hasOut) newStatus = "appuntamento_in_out_fissato";
      else if (hasIn) newStatus = "appuntamento_in_fissato";
      else if (hasOut) newStatus = "appuntamento_out_fissato";
      else newStatus = "confermata";

      await supabase.from("bookings").update({ status: newStatus as any }).eq("id", booking.id);

      toast.success("Appuntamenti salvati!");
      queryClient.invalidateQueries({ queryKey: ["cliente-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["client-booking-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["client-appt-counts"] });
      setScheduleMode(false);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (!booking) return null;

  const totalPaid = booking.payments
    ?.filter((p: any) => p.payment_type !== "rimborso")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const catNames = booking.booking_cats?.map((bc: any) => bc.cats?.name).filter(Boolean);
  const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date));

  const renderSlotButton = (
    slot: { time: string; available: number; maxAppts: number },
    selectedTime: string | null,
    setTime: (t: string | null) => void,
    currentTime: string | null,
  ) => {
    const isSelected = selectedTime === slot.time;
    const isCurrent = currentTime === slot.time;
    return (
      <Button
        key={slot.time}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        disabled={slot.available <= 0 && !isCurrent}
        onClick={() => setTime(isSelected ? null : slot.time)}
        className="relative gap-1.5"
      >
        {slot.time}
        {isCurrent && <Badge variant="secondary" className="text-xs px-1.5 py-0">attuale</Badge>}
        {!isCurrent && slot.available <= 0 && <span className="ml-1 text-xs">(pieno)</span>}
        {!isCurrent && slot.available > 0 && slot.available < slot.maxAppts && (
          <Badge variant="secondary" className="text-xs px-1 py-0">{slot.available}</Badge>
        )}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pratica #{booking.booking_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking details - read only */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Check-in</p>
                <p className="font-medium">{format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: it })}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Check-out</p>
                <p className="font-medium">{format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: it })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Durata</p>
              <p className="font-medium">{nights} nott{nights === 1 ? "e" : "i"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tipo casetta</p>
              <p className="font-medium capitalize">{booking.cage_pool_type} ({booking.units_occupied})</p>
            </div>
          </div>

          {catNames?.length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Animali</p>
              <p className="font-medium">🐾 {catNames.join(", ")}</p>
            </div>
          )}

          {booking.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Note</p>
              <p>{booking.notes}</p>
            </div>
          )}

          <Separator />

          {/* Financials */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totale</span>
              <span className="font-bold">€ {Number(booking.total_amount || 0).toFixed(2)}</span>
            </div>
            {booking.deposit_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Caparra</span>
                <span>€ {Number(booking.deposit_amount).toFixed(2)}</span>
              </div>
            )}
            {totalPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagato</span>
                <span className="text-primary font-medium">€ {totalPaid.toFixed(2)}</span>
              </div>
            )}
            {Number(booking.total_amount || 0) - totalPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Residuo</span>
                <span className="font-medium text-destructive">€ {(Number(booking.total_amount || 0) - totalPaid).toFixed(2)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Appointments section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Appuntamenti</Label>
              {canSchedule && !scheduleMode && (
                <Button size="sm" variant="outline" onClick={() => setScheduleMode(true)}>
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {hasAppointments ? "Modifica" : "Fissa appuntamenti"}
                </Button>
              )}
            </div>

            {!scheduleMode && (
              <>
                {hasAppointments ? (
                  <div className="space-y-2">
                    {existingCheckIn && (
                      <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Check-in:</span>
                        <span className="font-medium">
                          {format(parseISO(booking.check_in_date), "dd MMM yyyy", { locale: it })} ore {existingCheckIn.time}
                        </span>
                      </div>
                    )}
                    {existingCheckOut && (
                      <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Check-out:</span>
                        <span className="font-medium">
                          {format(parseISO(booking.check_out_date), "dd MMM yyyy", { locale: it })} ore {existingCheckOut.time}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0" />
                    {canSchedule
                      ? "Nessun appuntamento fissato. Clicca su \"Fissa appuntamenti\" per scegliere gli orari."
                      : "Gli appuntamenti saranno disponibili dopo la conferma della prenotazione."
                    }
                  </div>
                )}
              </>
            )}

            {/* Schedule mode */}
            {scheduleMode && (
              <div className="space-y-4 p-3 rounded-lg border bg-background">
                {/* Check-in slots */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Check-in — {checkInDate ? format(parseISO(checkInDate), "EEEE dd MMM yyyy", { locale: it }) : ""}
                  </Label>
                  {!checkInSlots.length ? (
                    <p className="text-xs text-muted-foreground">Nessuno slot disponibile per questo giorno.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {checkInSlots.map((slot) => renderSlotButton(slot, checkInTime, setCheckInTime, existingCheckIn?.time ?? null))}
                    </div>
                  )}
                </div>

                {/* Check-out slots */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Check-out — {checkOutDate ? format(parseISO(checkOutDate), "EEEE dd MMM yyyy", { locale: it }) : ""}
                  </Label>
                  {!checkOutSlots.length ? (
                    <p className="text-xs text-muted-foreground">Nessuno slot disponibile per questo giorno.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {checkOutSlots.map((slot) => renderSlotButton(slot, checkOutTime, setCheckOutTime, existingCheckOut?.time ?? null))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => {
                    setScheduleMode(false);
                    setCheckInTime(existingCheckIn?.time ?? null);
                    setCheckOutTime(existingCheckOut?.time ?? null);
                  }}>
                    Annulla
                  </Button>
                  <Button size="sm" onClick={handleSaveAppointments} disabled={saving}>
                    {saving ? "Salvataggio..." : "Conferma orari"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
