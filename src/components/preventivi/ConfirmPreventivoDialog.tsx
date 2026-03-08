import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePaymentMethods } from "@/hooks/usePayments";
import { format } from "date-fns";
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
