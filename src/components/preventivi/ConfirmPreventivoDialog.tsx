import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { usePaymentMethods } from "@/hooks/usePayments";
import { useBookings } from "@/hooks/useBookings";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { useOccupancyData, usePoolOccupancyData, checkAvailability } from "@/components/OccupancyGrid";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface ConfirmPreventivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preventivo: any;
  onConfirm: (data: {
    amount: number;
    payment_date: string;
    payment_method_id: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ConfirmPreventivoDialog({
  open, onOpenChange, preventivo, onConfirm, isLoading,
}: ConfirmPreventivoDialogProps) {
  const { data: paymentMethods } = usePaymentMethods();
  const suggestedDeposit = Number(preventivo?.deposit_amount ?? 0);

  const [amount, setAmount] = useState(suggestedDeposit > 0 ? suggestedDeposit.toString() : "");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [methodId, setMethodId] = useState("");
  const [notes, setNotes] = useState("");

  // Reset on open
  const handleOpenChange = (v: boolean) => {
    if (v) {
      const dep = Number(preventivo?.deposit_amount ?? 0);
      setAmount(dep > 0 ? dep.toString() : "");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setMethodId("");
      setNotes("");
    }
    onOpenChange(v);
  };

  const parsedAmount = parseFloat(amount);
  const isValid = parsedAmount > 0 && methodId && paymentDate;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await onConfirm({
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method_id: methodId,
        notes: notes.trim() || undefined,
      });
    } catch (err: any) {
      toast.error(err.message || "Errore durante la conferma");
    }
  };

  // ── Availability check ──
  const { data: allBookings } = useBookings();
  const { data: tenantConfig } = useTenantConfig();
  const occupancyDays = tenantConfig?.occupancy_rule_days ?? 3;
  const petType = tenantConfig?.pet_type as "gatti" | "cani" | "entrambi" | undefined;

  const cageUnits = useMemo<("singola" | "doppia")[]>(() => {
    if (!preventivo) return [];
    const bd = (preventivo.price_breakdown as any);
    if (bd?.cageUnits && Array.isArray(bd.cageUnits)) return bd.cageUnits;
    const type = preventivo.cage_pool_type as "singola" | "doppia";
    const n = preventivo.units_occupied ?? 1;
    return Array.from({ length: n }, () => type);
  }, [preventivo]);

  const bookingPetType = (preventivo?.pet_type ?? null) as "gatti" | "cani" | "entrambi" | null;
  const isMixedPets = petType === "entrambi" && bookingPetType === "entrambi";

  const cageUnitsGatti = useMemo<("singola" | "doppia")[]>(() => {
    if (!isMixedPets) return [];
    const bd = (preventivo?.price_breakdown as any);
    if (bd?.cageUnitsGatti && Array.isArray(bd.cageUnitsGatti)) return bd.cageUnitsGatti;
    return [];
  }, [isMixedPets, preventivo]);

  const cageUnitsCani = useMemo<("singola" | "doppia")[]>(() => {
    if (!isMixedPets) return [];
    const bd = (preventivo?.price_breakdown as any);
    if (bd?.cageUnitsCani && Array.isArray(bd.cageUnitsCani)) return bd.cageUnitsCani;
    return [];
  }, [isMixedPets, preventivo]);

  const singoleGatti = (tenantConfig as any)?.num_singole_gatti ?? 0;
  const doppieGatti = (tenantConfig as any)?.num_doppie_gatti ?? 0;
  const singoleCani = (tenantConfig as any)?.num_singole_cani ?? 0;
  const doppieCani = (tenantConfig as any)?.num_doppie_cani ?? 0;
  const totalSingole = petType !== "entrambi"
    ? (tenantConfig?.num_singole ?? 0)
    : bookingPetType === "gatti" ? singoleGatti
    : bookingPetType === "cani" ? singoleCani
    : (tenantConfig?.num_singole ?? 0);
  const totalDoppie = petType !== "entrambi"
    ? (tenantConfig?.num_doppie ?? 0)
    : bookingPetType === "gatti" ? doppieGatti
    : bookingPetType === "cani" ? doppieCani
    : (tenantConfig?.num_doppie ?? 0);

  const { bookingOccupancy } = useOccupancyData(allBookings ?? [], occupancyDays, preventivo?.id, petType);
  const { bookingOccupancy: poolOccupancyGatti } = usePoolOccupancyData(allBookings ?? [], occupancyDays, "gatti", preventivo?.id);
  const { bookingOccupancy: poolOccupancyCani } = usePoolOccupancyData(allBookings ?? [], occupancyDays, "cani", preventivo?.id);

  const checkInStr = preventivo?.check_in_date ?? "";

  const availabilityResultGatti = useMemo(() => {
    if (!isMixedPets || !checkInStr || cageUnitsGatti.length === 0) return null;
    return checkAvailability(poolOccupancyGatti, checkInStr, occupancyDays, cageUnitsGatti, singoleGatti, doppieGatti);
  }, [isMixedPets, checkInStr, cageUnitsGatti, poolOccupancyGatti, occupancyDays, singoleGatti, doppieGatti]);

  const availabilityResultCani = useMemo(() => {
    if (!isMixedPets || !checkInStr || cageUnitsCani.length === 0) return null;
    return checkAvailability(poolOccupancyCani, checkInStr, occupancyDays, cageUnitsCani, singoleCani, doppieCani);
  }, [isMixedPets, checkInStr, cageUnitsCani, poolOccupancyCani, occupancyDays, singoleCani, doppieCani]);

  const availabilityResult = useMemo(() => {
    if (isMixedPets || !checkInStr || cageUnits.length === 0) return null;
    const filtered = petType === "entrambi" && bookingPetType
      ? bookingOccupancy.filter(bo => {
          const bpt = (bo.booking as any).pet_type;
          return bpt === bookingPetType || bpt === "entrambi" || !bpt;
        })
      : bookingOccupancy;
    return checkAvailability(filtered, checkInStr, occupancyDays, cageUnits, totalSingole, totalDoppie);
  }, [isMixedPets, checkInStr, cageUnits, bookingOccupancy, occupancyDays, totalSingole, totalDoppie, petType, bookingPetType]);

  const hasConflicts = isMixedPets
    ? (availabilityResultGatti && !availabilityResultGatti.available) || (availabilityResultCani && !availabilityResultCani.available)
    : availabilityResult && !availabilityResult.available;

  if (!preventivo) return null;

  const clientName = preventivo.client
    ? `${preventivo.client.first_name} ${preventivo.client.last_name}`
    : "—";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conferma preventivo → Prenotazione</DialogTitle>
          <DialogDescription>
            {preventivo.booking_number} — {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totale preventivo</span>
              <span className="font-medium">€ {Number(preventivo.total_amount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caparra prevista</span>
              <span className="font-medium">€ {suggestedDeposit.toFixed(2)}</span>
            </div>
          </div>

          {/* Availability conflicts */}
          {isMixedPets && availabilityResultGatti && !availabilityResultGatti.available && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                🐱 Casette gatti insufficienti: {availabilityResultGatti.conflicts.map(c =>
                  `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                ).join(", ")}
              </AlertDescription>
            </Alert>
          )}
          {isMixedPets && availabilityResultCani && !availabilityResultCani.available && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                🐶 Casette cani insufficienti: {availabilityResultCani.conflicts.map(c =>
                  `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                ).join(", ")}
              </AlertDescription>
            </Alert>
          )}
          {!isMixedPets && hasConflicts && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Disponibilità insufficiente nei giorni: {availabilityResult!.conflicts.map(c =>
                  `${format(parseISO(c.date), "dd/MM")} (${c.type}: ${c.occupied}/${c.total})`
                ).join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Caparra versata *</Label>
            <Input
              id="deposit-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Importo versato"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount && parsedAmount <= 0 && (
              <p className="text-xs text-destructive">L'importo deve essere maggiore di 0</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date">Data transazione *</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Modalità di pagamento *</Label>
            {!paymentMethods?.length ? (
              <p className="text-sm text-muted-foreground">
                Nessuna modalità configurata. Vai in Impostazioni → Modalità di pagamento.
              </p>
            ) : (
              <Select value={methodId} onValueChange={setMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona modalità..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Note (opzionale)</Label>
            <Textarea
              id="payment-notes"
              placeholder="Note sulla transazione..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? "Conferma..." : "Conferma e Registra Caparra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
