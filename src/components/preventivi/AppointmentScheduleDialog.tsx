import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, parseISO, getDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  useSlotConfigsForDay,
  useAppointmentCounts,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useBookingAppointments,
  generateTimeSlots,
} from "@/hooks/useAppointments";
import { useTransitionBooking } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

export function AppointmentScheduleDialog({ open, onOpenChange, booking }: Props) {
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const transitionBooking = useTransitionBooking();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const bookingId = booking?.id;
  const { data: existingAppointments } = useBookingAppointments(open ? bookingId : undefined);

  const checkInDate = booking?.check_in_date;
  const checkOutDate = booking?.check_out_date;

  // Extract existing appointment times
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

  const isEditMode = !!(existingCheckIn || existingCheckOut);

  // Pre-select existing times when dialog opens
  useEffect(() => {
    if (open) {
      setCheckInTime(existingCheckIn?.time ?? null);
      setCheckOutTime(existingCheckOut?.time ?? null);
    }
  }, [open, existingCheckIn?.time, existingCheckOut?.time]);

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

  const { data: checkInSlotConfigs } = useSlotConfigsForDay("check_in", checkInDow);
  const { data: checkOutSlotConfigs } = useSlotConfigsForDay("check_out", checkOutDow);
  const { data: checkInCounts } = useAppointmentCounts(checkInDate, "check_in");
  const { data: checkOutCounts } = useAppointmentCounts(checkOutDate, "check_out");

  const checkInSlots = useMemo(() => {
    if (!checkInSlotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of checkInSlotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        let used = checkInCounts?.[time] ?? 0;
        // Don't count existing appointment as "used"
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

  const handleConfirm = async () => {
    if (!booking) return;
    if (!checkInTime && !checkOutTime) {
      toast.error("Seleziona almeno un appuntamento");
      return;
    }
    setSaving(true);
    try {
      // Handle check-in
      if (checkInTime && checkInDate) {
        if (existingCheckIn && checkInTime !== existingCheckIn.time) {
          // Update existing
          await updateAppointment.mutateAsync({
            id: existingCheckIn.id,
            scheduled_at: `${checkInDate}T${checkInTime}:00`,
          });
        } else if (!existingCheckIn) {
          // Create new
          const selectedSlot = checkInSlots.find(s => s.time === checkInTime);
          await createAppointment.mutateAsync({
            booking_id: booking.id,
            appointment_type: "check_in",
            scheduled_at: `${checkInDate}T${checkInTime}:00`,
            duration_minutes: selectedSlot?.duration ?? 30,
          });
        }
      } else if (!checkInTime && existingCheckIn) {
        // Remove existing check-in
        await deleteAppointment.mutateAsync({ id: existingCheckIn.id, bookingId: booking.id });
      }

      // Handle check-out
      if (checkOutTime && checkOutDate) {
        if (existingCheckOut && checkOutTime !== existingCheckOut.time) {
          await updateAppointment.mutateAsync({
            id: existingCheckOut.id,
            scheduled_at: `${checkOutDate}T${checkOutTime}:00`,
          });
        } else if (!existingCheckOut) {
          const selectedSlot = checkOutSlots.find(s => s.time === checkOutTime);
          await createAppointment.mutateAsync({
            booking_id: booking.id,
            appointment_type: "check_out",
            scheduled_at: `${checkOutDate}T${checkOutTime}:00`,
            duration_minutes: selectedSlot?.duration ?? 30,
          });
        }
      } else if (!checkOutTime && existingCheckOut) {
        await deleteAppointment.mutateAsync({ id: existingCheckOut.id, bookingId: booking.id });
      }

      // Update booking status based on final state
      const hasIn = !!checkInTime;
      const hasOut = !!checkOutTime;
      let newStatus: string;
      if (hasIn && hasOut) {
        newStatus = "appuntamento_in_out_fissato";
      } else if (hasIn) {
        newStatus = "appuntamento_in_fissato";
      } else if (hasOut) {
        newStatus = "appuntamento_out_fissato";
      } else {
        newStatus = "confermata";
      }
      await transitionBooking.mutateAsync({ id: booking.id, newStatus });

      toast.success(isEditMode ? "Appuntamenti aggiornati" : "Appuntamenti fissati");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSaving(false);
    }
  };

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
        {isCurrent && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">attuale</Badge>
        )}
        {!isCurrent && slot.available <= 0 && (
          <span className="ml-1 text-xs">(pieno)</span>
        )}
        {!isCurrent && slot.available > 0 && slot.available < slot.maxAppts && (
          <Badge variant="secondary" className="text-xs px-1 py-0">{slot.available}</Badge>
        )}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Modifica Appuntamenti" : "Fissa Appuntamenti"}</DialogTitle>
        </DialogHeader>

        {booking && (
          <div className="space-y-1 text-sm border-b pb-3">
            <p><span className="text-muted-foreground">Prenotazione:</span> <span className="font-mono">{booking.booking_number}</span></p>
            <p><span className="text-muted-foreground">Cliente:</span> {booking.client?.first_name} {booking.client?.last_name}</p>
            <p><span className="text-muted-foreground">Totale:</span> € {Number(booking.total_amount ?? 0).toFixed(2)}</p>
          </div>
        )}

        <div className="space-y-5 py-2">
          {/* Check-in slot */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Appuntamento Check-in — {checkInDate ? format(parseISO(checkInDate), "EEEE dd MMM yyyy", { locale: it }) : ""}
            </Label>
            {!checkInSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {checkInSlots.map((slot) => renderSlotButton(slot, checkInTime, setCheckInTime, existingCheckIn?.time ?? null))}
              </div>
            )}
          </div>

          {/* Check-out slot */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Appuntamento Check-out — {checkOutDate ? format(parseISO(checkOutDate), "EEEE dd MMM yyyy", { locale: it }) : ""}
            </Label>
            {!checkOutSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {checkOutSlots.map((slot) => renderSlotButton(slot, checkOutTime, setCheckOutTime, existingCheckOut?.time ?? null))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvataggio..." : isEditMode ? "Aggiorna Appuntamenti" : "Fissa Appuntamenti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
