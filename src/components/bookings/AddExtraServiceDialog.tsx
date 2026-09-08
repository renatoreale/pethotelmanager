import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePriceLists } from "@/hooks/usePensioneConfig";
import { useUpdatePreventivo } from "@/hooks/usePreventivi";
import type { Booking } from "@/hooks/useBookings";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: Booking | null;
}

function calcExtraTotal(tariffType: string, quantity: number, unitCost: number, fixedCost: number, includedKm: number, extraKmCost: number): number {
  if (tariffType === "extra_giornaliero") return unitCost * quantity;
  if (tariffType === "extra_km") {
    const extraKm = Math.max(0, quantity - includedKm);
    return fixedCost + extraKm * extraKmCost;
  }
  return fixedCost;
}

// Aggiunge un servizio extra del Listino Prezzi direttamente a un soggiorno
// già esistente (senza dover riaprire l'intero preventivo). La riga viene
// salvata nello stesso formato usato da PreventivoDialog (extraServices in
// price_breakdown), così resta visibile e modificabile anche riaprendo il
// preventivo completo.
export function AddExtraServiceDialog({ open, onOpenChange, booking }: Props) {
  const { data: priceLists } = usePriceLists();
  const updatePreventivo = useUpdatePreventivo();
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  const availableServices = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter((pl: any) => {
      if (!["extra_giornaliero", "extra_km", "extra_una_tantum"].includes(pl.tariff_type) || !pl.is_active) return false;
      if (!pl.pet_type || !booking?.pet_type || booking.pet_type === "entrambi") return true;
      return pl.pet_type === booking.pet_type;
    });
  }, [priceLists, booking?.pet_type]);

  const selected = availableServices.find((s: any) => s.id === selectedId);

  const total = selected ? calcExtraTotal(
    selected.tariff_type,
    selected.tariff_type === "extra_una_tantum" ? 1 : quantity,
    Number(selected.price_per_day ?? 0),
    Number(selected.fixed_cost ?? 0),
    Number(selected.included_km ?? 0),
    Number(selected.extra_km_cost ?? 0),
  ) : 0;

  const reset = () => {
    setSelectedId("");
    setQuantity(1);
  };

  const handleAdd = async () => {
    if (!booking || !selected) return;
    setSaving(true);
    try {
      const newLine = {
        id: `line-extra-${Date.now()}`,
        priceListId: selected.id,
        name: selected.name,
        tariffType: selected.tariff_type,
        quantity: selected.tariff_type === "extra_una_tantum" ? 1 : quantity,
        unitCost: Number(selected.price_per_day ?? 0),
        fixedCost: Number(selected.fixed_cost ?? 0),
        includedKm: Number(selected.included_km ?? 0),
        extraKmCost: Number(selected.extra_km_cost ?? 0),
        total,
      };

      const existingBreakdown = booking.price_breakdown ?? {};
      const existingExtras = Array.isArray(existingBreakdown.extraServices) ? existingBreakdown.extraServices : [];
      const updatedExtras = [...existingExtras, newLine];
      const updatedExtrasTotal = updatedExtras.reduce((sum: number, s: any) => sum + Number(s.total ?? 0), 0);

      const newTotalAmount = Number(booking.total_amount ?? 0) + total;
      const newBreakdown = {
        ...existingBreakdown,
        extraServices: updatedExtras,
        extrasTotal: updatedExtrasTotal,
        grandTotal: newTotalAmount,
      };
      const noteLine = `[Servizio extra aggiunto: ${selected.name} — €${total.toFixed(2)}]`;
      const newNotes = [booking.notes?.trim(), noteLine].filter(Boolean).join("\n");

      await updatePreventivo.mutateAsync({
        id: booking.id,
        total_amount: newTotalAmount,
        notes: newNotes,
        price_breakdown: newBreakdown,
      });

      toast.success(`${selected.name} aggiunto al soggiorno`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'aggiunta del servizio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Aggiungi servizio extra
          </DialogTitle>
          <DialogDescription>
            {booking && `Prenotazione ${booking.booking_number}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun servizio extra attivo nel Listino Prezzi. Aggiungine uno da Impostazioni Pensione → Listino Prezzi.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Servizio</Label>
                <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setQuantity(1); }}>
                  <SelectTrigger><SelectValue placeholder="Seleziona un servizio..." /></SelectTrigger>
                  <SelectContent>
                    {availableServices.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected?.description && (
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                )}
              </div>

              {selected?.tariff_type === "extra_giornaliero" && (
                <div className="space-y-2">
                  <Label>Giorni</Label>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">€ {Number(selected.price_per_day).toFixed(2)}/giorno</p>
                </div>
              )}

              {selected?.tariff_type === "extra_km" && (
                <div className="space-y-2">
                  <Label>Km totali</Label>
                  <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">
                    base € {Number(selected.fixed_cost).toFixed(2)} + {selected.included_km} km inclusi, extra € {Number(selected.extra_km_cost).toFixed(2)}/km
                  </p>
                </div>
              )}

              {selected && (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3 flex justify-between text-sm font-semibold">
                  <span>Totale servizio</span>
                  <span>€ {total.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Aggiunta..." : "Aggiungi al soggiorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
