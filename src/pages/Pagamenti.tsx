import { useState, useMemo, useEffect } from "react";
import {
  useAllBookingsWithPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  usePaymentMethods,
} from "@/hooks/usePayments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AutocompleteSearch } from "@/components/AutocompleteSearch";
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
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search, User, Cat, Calendar, CreditCard,
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

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivo",
  confermata: "Confermata",
  appuntamento_fissato: "App. Fissato",
  appuntamento_in_fissato: "App. IN Fissato",
  appuntamento_out_fissato: "App. OUT Fissato",
  appuntamento_in_out_fissato: "App. IN/OUT",
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

function MoneyBadge({ value, variant }: { value: number; variant: "total" | "paid" | "remaining" }) {
  const colors = {
    total: "bg-secondary text-secondary-foreground",
    paid: "bg-accent/10 text-accent",
    remaining: value > 0 ? "bg-warning/10 text-warning-foreground" : "bg-accent/10 text-accent",
  };
  const labels = { total: "Totale", paid: "Pagato", remaining: "Residuo" };
  return (
    <div className={`rounded-lg px-3 py-1.5 text-center ${colors[variant]}`}>
      <div className="text-[10px] uppercase tracking-wider font-medium opacity-70">{labels[variant]}</div>
      <div className="font-mono text-sm font-semibold">€ {value.toFixed(2)}</div>
    </div>
  );
}

export default function Pagamenti() {
  const { data: bookings, isLoading } = useAllBookingsWithPayments();
  const { data: paymentMethods } = usePaymentMethods();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterResiduo, setFilterResiduo] = useState(false);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txEditId, setTxEditId] = useState<string | null>(null);
  const [txBookingId, setTxBookingId] = useState<string>("");
  const [txForm, setTxForm] = useState<TransactionFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Keep selectedBooking in sync with fresh data from the query cache
  useEffect(() => {
    if (selectedBooking && bookings) {
      const fresh = bookings.find((b: any) => b.id === selectedBooking.id);
      if (fresh) {
        setSelectedBooking(fresh);
      }
    }
  }, [bookings]);

  const clientGroups = useMemo(() => {
    if (!bookings) return [];
    const map = new Map<string, { clientId: string; clientName: string; catNames: string; bookings: any[] }>();
    for (const b of bookings) {
      const cid = b.client_id;
      if (!map.has(cid)) {
        const cName = b.client ? `${b.client.last_name} ${b.client.first_name}` : "—";
        map.set(cid, { clientId: cid, clientName: cName, catNames: "", bookings: [] });
      }
      const group = map.get(cid)!;
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
    if (filterResiduo) {
      groups = groups.map(g => ({
        ...g,
        bookings: g.bookings.filter((b: any) => {
          const bTotal = Number(b.total_amount ?? 0);
          const { net } = calcTotals(b.payments ?? []);
          return bTotal - net > 0;
        }),
      })).filter(g => g.bookings.length > 0);
    }
    groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    return groups;
  }, [bookings, search, filterResiduo]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openBookingTransactions = (booking: any) => {
    setSelectedBooking(booking);
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
    if (!amount || amount <= 0) { toast.error("Inserisci un importo valido"); return; }
    if (!txForm.payment_method_id) { toast.error("Seleziona una modalità di pagamento"); return; }
    try {
      if (txEditId) {
        await updatePayment.mutateAsync({
          id: txEditId, amount, payment_type: txForm.payment_type,
          payment_date: txForm.payment_date, payment_method_id: txForm.payment_method_id,
          notes: txForm.notes || null,
        });
        toast.success("Transazione aggiornata");
      } else {
        await createPayment.mutateAsync({
          booking_id: txBookingId, amount, payment_type: txForm.payment_type,
          payment_date: txForm.payment_date, payment_method_id: txForm.payment_method_id,
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
    } catch { toast.error("Errore nell'eliminazione"); }
    setDeleteId(null);
  };

  // Global totals
  const globalTotals = useMemo(() => {
    if (!clientGroups.length) return { total: 0, paid: 0, remaining: 0 };
    let total = 0, paid = 0;
    clientGroups.forEach(g => {
      g.bookings.forEach((b: any) => {
        total += Number(b.total_amount ?? 0);
        const { net } = calcTotals(b.payments ?? []);
        paid += net;
      });
    });
    return { total, paid, remaining: total - paid };
  }, [clientGroups]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagamenti</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestione caparre, saldi, extra e rimborsi.</p>
      </div>

      {/* Global summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Totale dovuto</div>
          <div className="text-2xl font-bold font-mono mt-1">€ {globalTotals.total.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--accent))" }}>Incassato</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: "hsl(var(--accent))" }}>€ {globalTotals.paid.toFixed(2)}</div>
        </div>
        <button
          onClick={() => setFilterResiduo(f => !f)}
          className={`rounded-xl border bg-card p-4 text-left transition-all cursor-pointer hover:ring-2 hover:ring-primary/30 ${filterResiduo ? "ring-2 ring-primary" : ""}`}
        >
          <div className={`text-xs font-medium uppercase tracking-wider ${globalTotals.remaining > 0 ? "text-warning-foreground" : ""}`} style={globalTotals.remaining <= 0 ? { color: "hsl(var(--accent))" } : {}}>
            Residuo {filterResiduo && "✓"}
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${globalTotals.remaining > 0 ? "text-warning-foreground" : ""}`} style={globalTotals.remaining <= 0 ? { color: "hsl(var(--accent))" } : {}}>
            € {globalTotals.remaining.toFixed(2)}
          </div>
        </button>
      </div>

      {/* Search */}
      <AutocompleteSearch
        value={search}
        onChange={setSearch}
        placeholder="Cerca cliente o gatto..."
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
      ) : !clientGroups.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">Nessun risultato</div>
      ) : (
        <div className="space-y-3">
          {clientGroups.map(group => {
            const clientExpanded = expandedClients.has(group.clientId);
            const clientTotal = group.bookings.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0);
            const clientPayments = group.bookings.flatMap((b: any) => b.payments ?? []);
            const { net: clientNet } = calcTotals(clientPayments);
            const clientRemaining = clientTotal - clientNet;

            return (
              <div key={group.clientId} className="rounded-xl border bg-card overflow-hidden">
                {/* Client header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleClient(group.clientId)}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{group.clientName}</div>
                    {group.catNames && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Cat className="h-3 w-3" />
                        {group.catNames}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {group.bookings.length} pren.
                    </Badge>
                    <div className="hidden sm:flex items-center gap-2">
                      <MoneyBadge value={clientTotal} variant="total" />
                      <MoneyBadge value={clientNet} variant="paid" />
                      <MoneyBadge value={clientRemaining} variant="remaining" />
                    </div>
                    {clientExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Mobile totals when collapsed */}
                <div className="flex sm:hidden items-center gap-2 px-4 pb-3 -mt-1">
                  <MoneyBadge value={clientTotal} variant="total" />
                  <MoneyBadge value={clientNet} variant="paid" />
                  <MoneyBadge value={clientRemaining} variant="remaining" />
                </div>

                {/* Expanded bookings */}
                {clientExpanded && (
                  <div className="border-t">
                    {group.bookings.map((b: any) => {
                      const bTotal = Number(b.total_amount ?? 0);
                      const bPayments = b.payments ?? [];
                      const { net: bNet } = calcTotals(bPayments);
                      const catNames = (b.booking_cats ?? []).map((bc: any) => bc.cat?.name).filter(Boolean).join(", ");
                      const paidPercent = bTotal > 0 ? Math.min(100, (bNet / bTotal) * 100) : 0;

                      return (
                        <div key={b.id} className="border-b last:border-b-0">
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 pl-8 text-left hover:bg-muted/20 transition-colors"
                            onClick={() => openBookingTransactions(b)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{b.booking_number}</span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {STATUS_LABELS[b.status] ?? b.status}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {bPayments.length} pag.
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {catNames && (
                                  <span className="flex items-center gap-1">
                                    <Cat className="h-3 w-3" />{catNames}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(b.check_in_date), "dd/MM/yy")} → {format(parseISO(b.check_out_date), "dd/MM/yy")}
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${paidPercent}%`,
                                      backgroundColor: paidPercent >= 100 ? "hsl(var(--accent))" : "hsl(var(--primary))",
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                                  € {bNet.toFixed(0)} / {bTotal.toFixed(0)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transactions List Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={open => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transazioni — {selectedBooking?.booking_number}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (!selectedBooking) return null;
            const bPayments = selectedBooking.payments ?? [];
            const bTotal = Number(selectedBooking.total_amount ?? 0);
            const { net: bNet } = calcTotals(bPayments);
            const bRemaining = bTotal - bNet;

            return (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <MoneyBadge value={bTotal} variant="total" />
                  <MoneyBadge value={bNet} variant="paid" />
                  <MoneyBadge value={bRemaining} variant="remaining" />
                </div>

                {bPayments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Nessuna transazione registrata
                  </div>
                ) : (
                  <div className="rounded-md border divide-y max-h-[300px] overflow-auto">
                    {[...bPayments]
                      .sort((a: any, b: any) => a.payment_date.localeCompare(b.payment_date))
                      .map((tx: any) => {
                        const isRimborso = tx.payment_type === "rimborso";
                        return (
                          <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                            <div className="text-xs text-muted-foreground w-24 shrink-0">
                              {format(parseISO(tx.payment_date), "dd MMM yyyy", { locale: it })}
                            </div>
                            <Badge
                              variant={isRimborso ? "destructive" : tx.payment_type === "caparra" ? "default" : "secondary"}
                              className="text-[10px] h-5 shrink-0"
                            >
                              {TYPE_LABELS[tx.payment_type] ?? tx.payment_type}
                            </Badge>
                            <div className="text-xs text-muted-foreground flex-1 truncate">
                              {tx.payment_method?.name ?? tx.method ?? "—"}
                              {tx.notes && <span className="ml-2 italic opacity-60">— {tx.notes}</span>}
                            </div>
                            <div className={`font-mono text-sm font-semibold shrink-0 ${isRimborso ? "text-destructive" : ""}`}>
                              {isRimborso ? "-" : "+"}€ {Number(tx.amount).toFixed(2)}
                            </div>
                            {!["check_in", "in_corso", "check_out", "chiusa", "cancellata", "rimborsata"].includes(selectedBooking.status) ? (
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditTx(selectedBooking.id, tx)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(tx.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="w-[52px] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {!["check_in", "in_corso", "check_out", "chiusa", "cancellata", "rimborsata"].includes(selectedBooking.status) && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { openNewTx(selectedBooking.id); }}>
                      <Plus className="h-4 w-4 mr-1" /> Nuova Transazione
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{txEditId ? "Modifica Transazione" : "Nuova Transazione"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Importo (€)</label>
                <Input type="number" step="0.01" min="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={txForm.payment_type} onValueChange={v => setTxForm(f => ({ ...f, payment_type: v as any }))}>
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
                <Input type="date" value={txForm.payment_date} onChange={e => setTxForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Modalità</label>
                <Select value={txForm.payment_method_id} onValueChange={v => setTxForm(f => ({ ...f, payment_method_id: v }))}>
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
              <Input value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opzionale" />
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
