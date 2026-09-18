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
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search, User, Cat, Calendar, CreditCard, FileDown, CalendarIcon,
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import { generatePagamentiPDF } from "@/lib/generatePagamentiPDF";

const TYPE_LABELS: Record<string, string> = {
  caparra: "Caparra",
  saldo: "Saldo",
  extra: "Extra",
  rimborso: "Rimborso",
  manuale: "Manuale",
  gestione_pratica: "Gestione pratica",
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
    .filter((p: any) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p: any) => p.payment_type === "rimborso")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  return { paid, refunded, net: paid - refunded };
}

interface TransactionFormData {
  amount: string;
  payment_type: "caparra" | "saldo" | "extra" | "rimborso" | "manuale" | "gestione_pratica";
  payment_date: string;
  payment_method_id: string;
  notes: string;
}

const emptyForm: TransactionFormData = {
  amount: "",
  payment_type: "manuale",
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
    <div className={`rounded-lg px-3 py-1.5 text-center min-w-[90px] ${colors[variant]}`}>
      <div className="text-[10px] uppercase tracking-wider font-medium opacity-70">{labels[variant]}</div>
      <div className="font-mono text-sm font-semibold">€ {value.toFixed(2)}</div>
    </div>
  );
}

export default function Pagamenti() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useAllBookingsWithPayments();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: tenantConfig } = useTenantConfig();
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
  const [editingTotal, setEditingTotal] = useState<string | null>(null);

  const [reportStatusFilter, setReportStatusFilter] = useState<"tutti" | "da_saldare">("tutti");
  const [reportClientFilter, setReportClientFilter] = useState<string>("tutti");
  const [reportMethodFilter, setReportMethodFilter] = useState<string>("tutti");
  const [reportPeriodMode, setReportPeriodMode] = useState<"tutto" | "range">("tutto");
  const [reportRangeFrom, setReportRangeFrom] = useState<Date>();
  const [reportRangeTo, setReportRangeTo] = useState<Date>();
  const [exportingPDF, setExportingPDF] = useState(false);

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
          return Math.max(0, bTotal - net) > 0;
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
    setEditingTotal(null);
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
    if (isNaN(amount) || amount === 0) { toast.error("Inserisci un importo valido"); return; }
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

  const saveBookingTotal = async (newTotal: number) => {
    if (!selectedBooking) return;
    try {
      await supabase.from("bookings").update({ total_amount: newTotal }).eq("id", selectedBooking.id);
      queryClient.invalidateQueries({ queryKey: ["bookings-with-payments"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["preventivi"] });
      queryClient.invalidateQueries({ queryKey: ["payments-all"] });
      queryClient.invalidateQueries({ queryKey: ["booking-payments"] });
      setEditingTotal(null);
      toast.success("Totale aggiornato");
    } catch {
      toast.error("Errore nell'aggiornamento del totale");
    }
  };

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
    return { total, paid, remaining: Math.max(0, total - paid) };
  }, [clientGroups]);

  const allClients = useMemo(() => {
    if (!bookings) return [];
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.client_id && !map.has(b.client_id)) {
        map.set(b.client_id, b.client ? `${b.client.last_name} ${b.client.first_name}` : "—");
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const reportRows = useMemo(() => {
    if (!bookings) return [];
    const rows: any[] = [];
    for (const b of bookings) {
      if (reportClientFilter !== "tutti" && b.client_id !== reportClientFilter) continue;

      const bTotal = Number(b.total_amount ?? 0);
      const { net } = calcTotals(b.payments ?? []);
      const residuo = Math.max(0, bTotal - net);
      if (reportStatusFilter === "da_saldare" && residuo <= 0) continue;

      const clientName = b.client ? `${b.client.last_name} ${b.client.first_name}` : "—";

      for (const p of (b.payments ?? [])) {
        if (reportMethodFilter !== "tutti" && p.payment_method_id !== reportMethodFilter) continue;

        if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
          const interval = { start: startOfDay(reportRangeFrom), end: endOfDay(reportRangeTo) };
          if (!isWithinInterval(parseISO(p.payment_date), interval)) continue;
        }

        rows.push({
          clientName,
          booking_number: b.booking_number,
          payment_date: p.payment_date,
          payment_type: p.payment_type,
          methodName: p.payment_method?.name ?? p.method ?? "—",
          amount: Number(p.amount),
          notes: p.notes,
        });
      }
    }
    return rows;
  }, [bookings, reportClientFilter, reportStatusFilter, reportMethodFilter, reportPeriodMode, reportRangeFrom, reportRangeTo]);

  const handleExportPDF = async () => {
    if (!tenantConfig || !reportRows.length) return;
    setExportingPDF(true);
    try {
      const summaryParts: string[] = [];
      if (reportPeriodMode === "range" && reportRangeFrom && reportRangeTo) {
        summaryParts.push(`Periodo: ${format(reportRangeFrom, "dd/MM/yyyy")} - ${format(reportRangeTo, "dd/MM/yyyy")}`);
      }
      if (reportStatusFilter === "da_saldare") summaryParts.push("Stato: Da saldare");
      if (reportClientFilter !== "tutti") {
        const c = allClients.find(c => c.id === reportClientFilter);
        if (c) summaryParts.push(`Cliente: ${c.name}`);
      }
      if (reportMethodFilter !== "tutti") {
        const m = (paymentMethods ?? []).find(m => m.id === reportMethodFilter);
        if (m) summaryParts.push(`Modalità: ${m.name}`);
      }
      await generatePagamentiPDF(reportRows, tenantConfig as any, summaryParts.join(" · ") || null);
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    } finally {
      setExportingPDF(false);
    }
  };

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
        placeholder="Cerca cliente o pet..."
        className="max-w-sm"
      />

      {/* Report Pagamenti */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold">Report Pagamenti</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPDF || !reportRows.length || !tenantConfig}
          >
            <FileDown className="mr-2 h-4 w-4" /> Esporta PDF
          </Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={reportStatusFilter} onValueChange={v => setReportStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i pagamenti</SelectItem>
              <SelectItem value="da_saldare">Da saldare</SelectItem>
            </SelectContent>
          </Select>
          <Select value={reportClientFilter} onValueChange={setReportClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i clienti</SelectItem>
              {allClients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reportMethodFilter} onValueChange={setReportMethodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte le modalità</SelectItem>
              {(paymentMethods ?? []).map(pm => (
                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reportPeriodMode} onValueChange={v => setReportPeriodMode(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutto">Tutto il periodo</SelectItem>
              <SelectItem value="range">Intervallo date</SelectItem>
            </SelectContent>
          </Select>
          {reportPeriodMode === "range" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reportRangeFrom ? format(reportRangeFrom, "dd MMM yyyy", { locale: it }) : "Dal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar mode="single" selected={reportRangeFrom} onSelect={setReportRangeFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reportRangeTo ? format(reportRangeTo, "dd MMM yyyy", { locale: it }) : "Al"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar mode="single" selected={reportRangeTo} onSelect={setReportRangeTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{reportRows.length} pagamenti corrispondenti ai filtri</p>
      </div>

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
            const clientRemaining = Math.max(0, clientTotal - clientNet);

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
            const bRemaining = Math.max(0, bTotal - bNet);

            return (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {editingTotal !== null ? (
                    <div className="rounded-lg border p-2 text-center space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Totale</div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 text-sm font-bold text-center"
                          value={editingTotal}
                          onChange={e => setEditingTotal(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              const v = parseFloat(editingTotal);
                              if (!isNaN(v)) saveBookingTotal(v);
                            }
                            if (e.key === "Escape") setEditingTotal(null);
                          }}
                        />
                      </div>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={() => setEditingTotal(null)}>Annulla</Button>
                        <Button size="sm" className="h-5 text-[10px] px-1.5" onClick={() => { const v = parseFloat(editingTotal); if (!isNaN(v)) saveBookingTotal(v); }}>Salva</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="text-left" onClick={() => setEditingTotal(String(bTotal))} title="Clicca per modificare il totale">
                      <MoneyBadge value={bTotal} variant="total" />
                    </button>
                  )}
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
                            {!["cancellata", "rimborsata"].includes(selectedBooking.status) && (
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditTx(selectedBooking.id, tx)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(tx.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {!["cancellata", "rimborsata"].includes(selectedBooking.status) && (
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
                <Input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} />
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
                    <SelectItem value="manuale">Manuale</SelectItem>
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
