import { useState, useMemo } from "react";
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
  generateTimeSlots,
} from "@/hooks/useAppointments";
import { useTransitionBooking } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any; // the preventivo being confirmed
}

export function AppointmentScheduleDialog({ open, onOpenChange, booking }: Props) {
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const transitionBooking = useTransitionBooking();
  const createAppointment = useCreateAppointment();

  const checkInDate = booking?.check_in_date;
  const checkOutDate = booking?.check_out_date;

  // Convert date to day_of_week (0=Monday...6=Sunday for our DAYS array)
  const checkInDow = useMemo(() => {
    if (!checkInDate) return undefined;
    const jsDay = getDay(parseISO(checkInDate)); // 0=Sun, 1=Mon...
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon...6=Sun
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

  // Generate available slots
  const checkInSlots = useMemo(() => {
    if (!checkInSlotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of checkInSlotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        const used = checkInCounts?.[time] ?? 0;
        const avail = config.max_appointments - used;
        slots.push({ time, available: avail, maxAppts: config.max_appointments, duration: config.slot_duration_minutes });
      }
    }
    return slots;
  }, [checkInSlotConfigs, checkInCounts]);

  const checkOutSlots = useMemo(() => {
    if (!checkOutSlotConfigs?.length) return [];
    const slots: { time: string; available: number; maxAppts: number; duration: number }[] = [];
    for (const config of checkOutSlotConfigs) {
      const times = generateTimeSlots(config);
      for (const time of times) {
        const used = checkOutCounts?.[time] ?? 0;
        const avail = config.max_appointments - used;
        slots.push({ time, available: avail, maxAppts: config.max_appointments, duration: config.slot_duration_minutes });
      }
    }
    return slots;
  }, [checkOutSlotConfigs, checkOutCounts]);

  const handleConfirm = async () => {
    if (!booking) return;
    if (!checkInTime && !checkOutTime) {
      toast.error("Seleziona almeno un appuntamento");
      return;
    }
    setSaving(true);
    try {
      // 1. Create check-in appointment if slot selected
      if (checkInTime && checkInDate) {
        const selectedSlot = checkInSlots.find(s => s.time === checkInTime);
        await createAppointment.mutateAsync({
          booking_id: booking.id,
          appointment_type: "check_in",
          scheduled_at: `${checkInDate}T${checkInTime}:00`,
          duration_minutes: selectedSlot?.duration ?? 30,
        });
      }

      // 2. Create check-out appointment if slot selected
      if (checkOutTime && checkOutDate) {
        const selectedSlot = checkOutSlots.find(s => s.time === checkOutTime);
        await createAppointment.mutateAsync({
          booking_id: booking.id,
          appointment_type: "check_out",
          scheduled_at: `${checkOutDate}T${checkOutTime}:00`,
          duration_minutes: selectedSlot?.duration ?? 30,
        });
      }

      // 3. Transition to appuntamento_fissato
      await transitionBooking.mutateAsync({ id: booking.id, newStatus: "appuntamento_fissato" });

      toast.success("Appuntamenti fissati");
      setCheckInTime(null);
      setCheckOutTime(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    } finally {
      setSaving(false);
    }
  };

  const DAYS_LABEL = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Conferma e Fissa Appuntamenti</DialogTitle>
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
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno. Puoi confermare senza appuntamento.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {checkInSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={checkInTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={slot.available <= 0}
                    onClick={() => setCheckInTime(checkInTime === slot.time ? null : slot.time)}
                    className="relative"
                  >
                    {slot.time}
                    {slot.available <= 0 && (
                      <span className="ml-1 text-xs">(pieno)</span>
                    )}
                    {slot.available > 0 && slot.available < slot.maxAppts && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{slot.available}</Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Check-out slot */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Appuntamento Check-out — {checkOutDate ? format(parseISO(checkOutDate), "EEEE dd MMM yyyy", { locale: it }) : ""}
            </Label>
            {!checkOutSlots.length ? (
              <p className="text-sm text-muted-foreground">Nessuno slot configurato per questo giorno. Puoi confermare senza appuntamento.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {checkOutSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={checkOutTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={slot.available <= 0}
                    onClick={() => setCheckOutTime(checkOutTime === slot.time ? null : slot.time)}
                    className="relative"
                  >
                    {slot.time}
                    {slot.available <= 0 && (
                      <span className="ml-1 text-xs">(pieno)</span>
                    )}
                    {slot.available > 0 && slot.available < slot.maxAppts && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">{slot.available}</Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Conferma in corso..." : "Conferma Prenotazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
