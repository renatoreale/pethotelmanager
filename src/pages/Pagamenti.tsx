import { useState, useMemo } from "react";
import {
  useAllBookingsWithPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  usePaymentMethods,
  Payment,
} from "@/hooks/usePayments";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

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

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivo",
  confermata: "Confermata",
  appuntamento_fissato: "App. Fissato",
  appuntamento_in_fissato: "App. IN Fissato",
  appuntamento_out_fissato: "App. OUT Fissato",
  appuntamento_in_out_fissato: "App. IN/OUT Fissato",
  check_in: "Check-in",
  in_corso: "In Corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

function calcTotals(payments: any[]) {
  const paid = payments
    .filter((p: any) => p.payment_type !== "rimborso")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p: any) => p.payment_type === "rimborso")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  return { paid, refunded, net: paid - refunded };
}

interface TransactionFormData {
  amount: string;
  payment_type: "caparra" | "saldo" | "extra" | "rimborso";
  payment_date: string;
  payment_method_id: string;
  notes: string;
}

const emptyForm: TransactionFormData = {
  amount: "",
  payment_type: "saldo",
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method_id: "",
  notes: "",
};

export default function Pagamenti() {
  const { data: bookings, isLoading } = useAllBookingsWithPayments();
  const { data: paymentMethods } = usePaymentMethods();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Transaction dialog
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txEditId, setTxEditId] = useState<string | null>(null);
  const [txBookingId, setTxBookingId] = useState<string>("");
  const [txForm, setTxForm] = useState<TransactionFormData>(emptyForm);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Group bookings by client
  const clientGroups = useMemo(() => {
    if (!bookings) return [];
    const map = new Map<string, { clientId: string; clientName: string; catNames: string; bookings: any[] }>();
    for (const b of bookings) {
      const cid = b.client_id;
      if (!map.has(cid)) {
        const cName = b.client
          ? `${b.client.last_name} ${b.client.first_name}`
          : "—";
        const cats = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ");
        map.set(cid, { clientId: cid, clientName: cName, catNames: cats, bookings: [] });
      }
      const group = map.get(cid)!;
      // Update cat names to include all cats from all bookings
      const newCats = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean);
      const existingCats = new Set(group.catNames.split(", ").filter(Boolean));
      newCats.forEach((c: string) => existingCats.add(c));
      group.catNames = Array.from(existingCats).join(", ");
      group.bookings.push(b);
    }
    let groups = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.filter(
        g => g.clientName.toLowerCase().includes(q) || g.catNames.toLowerCase().includes(q)
      );
    }
    groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    return groups;
  }, [bookings, search]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBooking = (id: string) => {
    setExpandedBookings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openNewTx = (bookingId: string) => {
    setTxEditId(null);
    setTxBookingId(bookingId);
    setTxForm(emptyForm);
    setTxDialogOpen(true);
  };

  const openEditTx = (bookingId: string, tx: any) => {
    setTxEditId(tx.id);
    setTxBookingId(bookingId);
    setTxForm({
      amount: String(tx.amount),
      payment_type: tx.payment_type,
      payment_date: tx.payment_date?.slice(0, 10) ?? emptyForm.payment_date,
      payment_method_id: tx.payment_method_id ?? "",
      notes: tx.notes ?? "",
    });
    setTxDialogOpen(true);
  };

  const saveTx = async () => {
    const amount = parseFloat(txForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    if (!txForm.payment_method_id) {
      toast.error("Seleziona una modalità di pagamento");
      return;
    }
    try {
      if (txEditId) {
        await updatePayment.mutateAsync({
          id: txEditId,
          amount,
          payment_type: txForm.payment_type,
          payment_date: txForm.payment_date,
          payment_method_id: txForm.payment_method_id,
          notes: txForm.notes || null,
        });
        toast.success("Transazione aggiornata");
      } else {
        await createPayment.mutateAsync({
          booking_id: txBookingId,
          amount,
          payment_type: txForm.payment_type,
          payment_date: txForm.payment_date,
          payment_method_id: txForm.payment_method_id,
          notes: txForm.notes || undefined,
        });
        toast.success("Transazione registrata");
      }
      setTxDialogOpen(false);
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePayment.mutateAsync(deleteId);
      toast.success("Transazione eliminata");
    } catch {
      toast.error("Errore nell'eliminazione");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Pagamenti</h1>
      <p className="text-muted-foreground text-sm">Caparre, saldi, extra e rimborsi per cliente e prenotazione.</p>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca cliente o gatto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !clientGroups.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Nessun risultato
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Cliente / Gatti</TableHead>
                <TableHead>Prenotazione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Totale</TableHead>
                <TableHead className="text-right">Pagato</TableHead>
                <TableHead className="text-right">Residuo</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientGroups.map(group => {
                const clientExpanded = expandedClients.has(group.clientId);
                // Client-level totals
                const clientTotal = group.bookings.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
                const clientPayments = group.bookings.flatMap((b: any) => b.payments ?? []);
                const { net: clientNet } = calcTotals(clientPayments);
                const clientRemaining = clientTotal - clientNet;

                return (
                  <>
                    <TableRow
                      key={group.clientId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleClient(group.clientId)}
                    >
                      <TableCell className="w-8">
                        {clientExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        {group.clientName}
                        {group.catNames && (
                          <span className="ml-2 text-xs text-muted-foreground">({group.catNames})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {group.bookings.length} prenotazion{group.bookings.length === 1 ? "e" : "i"}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono text-sm">€ {clientTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">€ {clientNet.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${clientRemaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                        € {clientRemaining.toFixed(2)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {clientExpanded && group.bookings.map((b: any) => {
                      const bookingExpanded = expandedBookings.has(b.id);
                      const bTotal = Number(b.total_amount ?? 0);
                      const bPayments = b.payments ?? [];
                      const { net: bNet } = calcTotals(bPayments);
                      const bRemaining = bTotal - bNet;
                      const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ");

                      return (
                        <>
                          <TableRow
                            key={b.id}
                            className="cursor-pointer bg-muted/20 hover:bg-muted/40"
                            onClick={() => toggleBooking(b.id)}
                          >
                            <TableCell className="w-8 pl-6">
                              {bookingExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </TableCell>
                            <TableCell className="text-sm">
                              {catNames || "—"}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {b.booking_number}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {format(parseISO(b.check_in_date), "dd/MM/yy")} → {format(parseISO(b.check_out_date), "dd/MM/yy")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {STATUS_LABELS[b.status] ?? b.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">€ {bTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-green-600">€ {bNet.toFixed(2)}</TableCell>
                            <TableCell className={`text-right font-mono text-sm ${bRemaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                              € {bRemaining.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={e => { e.stopPropagation(); openNewTx(b.id); }}
                                title="Nuova transazione"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {bookingExpanded && (
                            <>
                              {/* Summary bar */}
                              <TableRow className="bg-muted/10">
                                <TableCell colSpan={8} className="py-2 pl-12">
                                  <div className="flex items-center gap-6 text-xs">
                                    <span>Totale: <strong>€ {bTotal.toFixed(2)}</strong></span>
                                    <span className="text-green-600">Pagato: <strong>€ {bNet.toFixed(2)}</strong></span>
                                    <span className={bRemaining > 0 ? "text-amber-600" : "text-green-600"}>
                                      Residuo: <strong>€ {bRemaining.toFixed(2)}</strong>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs ml-auto"
                                      onClick={() => openNewTx(b.id)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Nuova transazione
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {bPayments.length === 0 ? (
                                <TableRow className="bg-muted/5">
                                  <TableCell colSpan={8} className="py-3 pl-12 text-center text-sm text-muted-foreground">
                                    Nessuna transazione registrata
                                  </TableCell>
                                </TableRow>
                              ) : (
                                bPayments
                                  .sort((a: any, b: any) => a.payment_date.localeCompare(b.payment_date))
                                  .map((tx: any) => (
                                    <TableRow key={tx.id} className="bg-muted/5">
                                      <TableCell />
                                      <TableCell className="pl-12 text-sm">
                                        {format(parseISO(tx.payment_date), "dd MMM yyyy", { locale: it })}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {tx.payment_method?.name ?? tx.method ?? "—"}
                                      </TableCell>
                                      <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[tx.payment_type] ?? "bg-muted"}`}>
                                          {TYPE_LABELS[tx.payment_type] ?? tx.payment_type}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm" colSpan={2}>
                                        {tx.payment_type === "rimborso" ? "-" : ""}€ {Number(tx.amount).toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                                        {tx.notes ?? ""}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={() => openEditTx(b.id, tx)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-destructive"
                                            onClick={() => setDeleteId(tx.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              )}
                            </>
                          )}
                        </>
                      );
                    })}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{txEditId ? "Modifica Transazione" : "Nuova Transazione"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Importo (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={txForm.payment_type}
                  onValueChange={v => setTxForm(f => ({ ...f, payment_type: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caparra">Caparra</SelectItem>
                    <SelectItem value="saldo">Saldo</SelectItem>
                    <SelectItem value="extra">Extra</SelectItem>
                    <SelectItem value="rimborso">Rimborso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  value={txForm.payment_date}
                  onChange={e => setTxForm(f => ({ ...f, payment_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Modalità</label>
                <Select
                  value={txForm.payment_method_id}
                  onValueChange={v => setTxForm(f => ({ ...f, payment_method_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    {(paymentMethods ?? []).map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note</label>
              <Input
                value={txForm.notes}
                onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Opzionale"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>Annulla</Button>
            <Button onClick={saveTx} disabled={createPayment.isPending || updatePayment.isPending}>
              {txEditId ? "Salva" : "Registra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la transazione?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
