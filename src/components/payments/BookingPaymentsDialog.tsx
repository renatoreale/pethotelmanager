import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard } from "lucide-react";
import { useBookingPayments } from "@/hooks/usePayments";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  caparra: "Caparra",
  saldo: "Saldo",
  extra: "Extra",
  rimborso: "Rimborso",
};

const TYPE_COLORS: Record<string, string> = {
  caparra: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  saldo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  extra: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  rimborso: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface BookingPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

export function BookingPaymentsDialog({ open, onOpenChange, booking }: BookingPaymentsDialogProps) {
  const { data: payments, isLoading } = useBookingPayments(booking?.id);

  if (!booking) return null;

  const totalPaid = (payments ?? [])
    .filter(p => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalRefunded = (payments ?? [])
    .filter(p => p.payment_type === "rimborso")
    .reduce((s, p) => s + Number(p.amount), 0);
  const netPaid = totalPaid - totalRefunded;
  const totalAmount = Number(booking.total_amount ?? 0);
  const remaining = Math.max(0, totalAmount - netPaid);

  const clientName = booking.client
    ? `${booking.client.first_name} ${booking.client.last_name}`
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamenti — {booking.booking_number}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{clientName}</p>

        <div className="grid grid-cols-3 gap-3 rounded-md bg-muted p-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Totale</div>
            <div className="font-medium">€ {totalAmount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Pagato</div>
            <div className="font-medium text-green-600">€ {netPaid.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Residuo</div>
            <div className={`font-medium ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
              € {remaining.toFixed(2)}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">Caricamento...</div>
        ) : !payments?.length ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Nessun pagamento registrato
          </div>
        ) : (
          <div className="rounded-md border max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Modalità</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {format(parseISO(p.payment_date), "dd MMM yyyy", { locale: it })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[p.payment_type] ?? "bg-muted"}`}>
                        {TYPE_LABELS[p.payment_type] ?? p.payment_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(p as any).payment_method?.name ?? p.method ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {p.payment_type === "rimborso" ? "-" : ""}€ {Number(p.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {payments && payments.length > 0 && payments.some(p => p.notes) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {payments.filter(p => p.notes).map(p => (
              <div key={p.id}>
                <span className="font-medium">{TYPE_LABELS[p.payment_type]}:</span> {p.notes}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
