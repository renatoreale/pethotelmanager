import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Search, CheckCircle2, FileText, CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { usePriceLists, useTenantConfig } from "@/hooks/usePensioneConfig";
import {
  usePreventivi, useCreatePreventivo, useUpdatePreventivo,
  useDeletePreventivo, useConfirmPreventivo, useClientCats,
} from "@/hooks/usePreventivi";

// ── Extra service line item ──
interface ExtraServiceLine {
  priceListId: string;
  name: string;
  tariffType: string;
  quantity: number; // days for giornaliero, km for km, 1 for una_tantum
  unitCost: number;
  fixedCost: number;
  includedKm: number;
  extraKmCost: number;
  total: number;
}

export default function Preventivi() {
  const { data: preventivi, isLoading } = usePreventivi();
  const createPreventivo = useCreatePreventivo();
  const updatePreventivo = useUpdatePreventivo();
  const deletePreventivo = useDeletePreventivo();
  const confirmPreventivo = useConfirmPreventivo();
  const { data: tenantConfig } = useTenantConfig();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [confirming, setConfirming] = useState<any>(null);

  // Stay calc helpers
  const stayCalcType = (tenantConfig as any)?.stay_calc_type ?? "notti";

  const calcStayDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
    if (stayCalcType === "notti") return nights;
    // giorni mode
    const countIn = (tenantConfig as any)?.count_checkin_day ?? false;
    const countOut = (tenantConfig as any)?.count_checkout_day ?? false;
    let days = nights;
    if (countIn) days += 1;
    if (countOut) days += 1;
    if (!countIn && !countOut) days = nights; // fallback to nights
    return Math.max(0, days);
  };

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

  const filtered = useMemo(() => {
    if (!preventivi) return [];
    if (!search.trim()) return preventivi;
    const q = search.toLowerCase();
    return preventivi.filter((p) => {
      const clientName = `${p.client?.first_name ?? ""} ${p.client?.last_name ?? ""}`.toLowerCase();
      return clientName.includes(q) || p.booking_number.toLowerCase().includes(q);
    });
  }, [preventivi, search]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setDialogOpen(true); };

  const handleConfirm = async () => {
    if (!confirming) return;
    try {
      await confirmPreventivo.mutateAsync(confirming.id);
      toast.success("Preventivo confermato → Prenotazione");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setConfirming(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deletePreventivo.mutateAsync(deleting.id);
      toast.success("Preventivo eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preventivi</h1>
          <p className="text-muted-foreground text-sm mt-1">Crea e gestisci i preventivi per i clienti</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuovo Preventivo</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per cliente o numero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">{filtered.length} preventiv{filtered.length === 1 ? "o" : "i"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-30" />
              Nessun preventivo trovato
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Preventivo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Gatti</TableHead>
                    <TableHead>Casetta</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>{stayCalcType === "notti" ? "Notti" : "Giorni"}</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Caparra</TableHead>
                    <TableHead className="w-[140px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const duration = calcStayDuration(p.check_in_date, p.check_out_date);
                    const catNames = p.booking_cats?.map(bc => bc.cat?.name).filter(Boolean).join(", ") || "—";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{p.booking_number}</TableCell>
                        <TableCell className="font-medium">
                          {p.client ? `${p.client.first_name} ${p.client.last_name}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{catNames}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {p.cage_pool_type === "singola" ? "Singola" : "Doppia"} ×{p.units_occupied}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_in_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_out_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell className="font-medium">€ {Number(p.total_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">€ {Number(p.deposit_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Conferma" onClick={() => setConfirming(p)}>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PreventivoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onCreate={createPreventivo}
        onUpdate={updatePreventivo}
        calcStayDuration={calcStayDuration}
        stayLabel={stayLabel}
      />

      <AlertDialog open={!!confirming} onOpenChange={() => setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confermare il preventivo?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming && `Il preventivo ${confirming.booking_number} diventerà una prenotazione confermata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Stai per eliminare "${deleting.booking_number}". Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── PREVENTIVO DIALOG ──
function PreventivoDialog({
  open, onOpenChange, editing, onCreate, onUpdate, calcStayDuration, stayLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any;
  onCreate: any;
  onUpdate: any;
  calcStayDuration: (ci: string, co: string) => number;
  stayLabel: string;
}) {
  const { data: clients } = useClients();
  const { data: priceLists } = usePriceLists();

  const [clientId, setClientId] = useState("");
  const [unitsOccupied, setUnitsOccupied] = useState(1);
  const [numSingole, setNumSingole] = useState(1);
  const [numDoppie, setNumDoppie] = useState(0);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [clientSearch, setClientSearch] = useState("");
  const [extraServices, setExtraServices] = useState<ExtraServiceLine[]>([]);

  const { data: clientCats } = useClientCats(clientId || undefined);

  const today = startOfDay(new Date());

  const checkIn = checkInDate ? format(checkInDate, "yyyy-MM-dd") : "";
  const checkOut = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : "";

  // Determine cage_pool_type from breakdown
  const cageType = numDoppie > 0 ? "doppia" : "singola";

  const resetForm = () => {
    if (editing) {
      setClientId(editing.client_id);
      setUnitsOccupied(editing.units_occupied);
      setNumSingole(editing.cage_pool_type === "doppia" ? 0 : editing.units_occupied);
      setNumDoppie(editing.cage_pool_type === "doppia" ? editing.units_occupied : 0);
      setCheckInDate(editing.check_in_date ? parseISO(editing.check_in_date) : undefined);
      setCheckOutDate(editing.check_out_date ? parseISO(editing.check_out_date) : undefined);
      setSelectedCats(editing.booking_cats?.map((bc: any) => bc.cat_id) ?? []);
      setNotes(editing.notes ?? "");
      setTotalAmount(Number(editing.total_amount ?? 0));
      setDepositAmount(Number(editing.deposit_amount ?? 0));
      setExtraServices([]);
    } else {
      setClientId("");
      setUnitsOccupied(1);
      setNumSingole(1);
      setNumDoppie(0);
      setCheckInDate(undefined);
      setCheckOutDate(undefined);
      setSelectedCats([]);
      setNotes("");
      setTotalAmount(0);
      setDepositAmount(0);
      setExtraServices([]);
    }
    setClientSearch("");
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open, editing]);

  // When check-out changes before check-in, fix it
  useEffect(() => {
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      setCheckOutDate(undefined);
    }
  }, [checkInDate]);

  const duration = calcStayDuration(checkIn, checkOut);

  // ── Price calculation ──
  const seasonalCalc = useMemo(() => {
    if (!priceLists || duration <= 0) return null;
    const seasonalTariffs = priceLists.filter(
      (pl: any) => pl.tariff_type === "stagionale" && pl.is_active
    );
    if (seasonalTariffs.length === 0) return null;
    const tariff = seasonalTariffs[0];
    const baseCost = Number(tariff.price_per_day) * duration;
    const extraCats = Math.max(0, selectedCats.length - 1);
    const supplement = extraCats * Number(tariff.extra_cat_supplement ?? 0) * duration;
    return { baseCost, supplement, total: baseCost + supplement, tariffName: tariff.name };
  }, [priceLists, duration, selectedCats.length]);

  const extraServicesTotal = useMemo(() => {
    return extraServices.reduce((sum, s) => sum + s.total, 0);
  }, [extraServices]);

  const grandTotal = (seasonalCalc?.total ?? 0) + extraServicesTotal;

  // Auto-apply calculation + deposit
  const applyCalculation = () => {
    setTotalAmount(grandTotal);
    setDepositAmount(Math.round(grandTotal * 50) / 100); // 50%
  };

  // Auto-update deposit when total changes (keep 50% unless manually changed)
  const [depositManuallySet, setDepositManuallySet] = useState(false);
  useEffect(() => {
    if (!depositManuallySet && totalAmount > 0) {
      setDepositAmount(Math.round(totalAmount * 50) / 100);
    }
  }, [totalAmount, depositManuallySet]);

  // Update units from singole + doppie
  useEffect(() => {
    setUnitsOccupied(numSingole + numDoppie);
  }, [numSingole, numDoppie]);

  // ── Extra services from price list ──
  const availableExtras = useMemo(() => {
    if (!priceLists) return [];
    return priceLists.filter(
      (pl: any) => pl.tariff_type !== "stagionale" && pl.is_active
    );
  }, [priceLists]);

  const addExtraService = (plId: string) => {
    const pl = availableExtras.find((p: any) => p.id === plId);
    if (!pl) return;
    const already = extraServices.find(s => s.priceListId === plId);
    if (already) return;

    const line: ExtraServiceLine = {
      priceListId: pl.id,
      name: pl.name,
      tariffType: pl.tariff_type,
      quantity: pl.tariff_type === "extra_una_tantum" ? 1 : (pl.tariff_type === "extra_giornaliero" ? duration : 0),
      unitCost: Number(pl.price_per_day ?? 0),
      fixedCost: Number(pl.fixed_cost ?? 0),
      includedKm: Number(pl.included_km ?? 0),
      extraKmCost: Number(pl.extra_km_cost ?? 0),
      total: 0,
    };
    line.total = calcExtraTotal(line);
    setExtraServices(prev => [...prev, line]);
  };

  const calcExtraTotal = (line: ExtraServiceLine): number => {
    if (line.tariffType === "extra_giornaliero") {
      return line.unitCost * line.quantity;
    }
    if (line.tariffType === "extra_km") {
      const extraKm = Math.max(0, line.quantity - line.includedKm);
      return line.fixedCost + extraKm * line.extraKmCost;
    }
    // una_tantum
    return line.fixedCost;
  };

  const updateExtraQuantity = (idx: number, qty: number) => {
    setExtraServices(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, quantity: qty };
      updated.total = calcExtraTotal(updated);
      return updated;
    }));
  };

  const removeExtraService = (idx: number) => {
    setExtraServices(prev => prev.filter((_, i) => i !== idx));
  };

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c: any) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const handleSave = async () => {
    if (!clientId) { toast.error("Seleziona un cliente"); return; }
    if (!checkIn || !checkOut) { toast.error("Date check-in/out obbligatorie"); return; }
    if (selectedCats.length === 0) { toast.error("Seleziona almeno un gatto"); return; }
    if (unitsOccupied > 1 && numSingole + numDoppie !== unitsOccupied) {
      toast.error("Il totale singole + doppie deve corrispondere alle casette occupate");
      return;
    }

    try {
      if (editing) {
        await onUpdate.mutateAsync({
          id: editing.id,
          client_id: clientId,
          cage_pool_type: cageType as "singola" | "doppia",
          units_occupied: unitsOccupied,
          check_in_date: checkIn,
          check_out_date: checkOut,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          notes: notes || null,
          cat_ids: selectedCats,
        });
        toast.success("Preventivo aggiornato");
      } else {
        await onCreate.mutateAsync({
          client_id: clientId,
          cage_pool_type: cageType as "singola" | "doppia",
          units_occupied: unitsOccupied,
          check_in_date: checkIn,
          check_out_date: checkOut,
          total_amount: totalAmount,
          deposit_amount: depositAmount,
          notes: notes || undefined,
          cat_ids: selectedCats,
        });
        toast.success("Preventivo creato");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const toggleCat = (catId: string) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica Preventivo" : "Nuovo Preventivo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          {/* Client selector */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Input
              placeholder="Cerca cliente per nome o email..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="mb-2"
            />
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setSelectedCats([]); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona cliente" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cats selector */}
          {clientId && (
            <div className="space-y-2">
              <Label>Gatti *</Label>
              {!clientCats?.length ? (
                <p className="text-sm text-muted-foreground">Nessun gatto registrato per questo cliente</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {clientCats.map((cat: any) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent"
                      onClick={() => toggleCat(cat.id)}
                    >
                      <Checkbox checked={selectedCats.includes(cat.id)} />
                      <span className="text-sm font-medium">{cat.name}</span>
                      {cat.needs_double_cage && (
                        <Badge variant="outline" className="text-xs">Casetta doppia</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Casette occupate */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Casette occupate</Label>
              <Input
                type="number" min={1} max={20}
                value={unitsOccupied}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setUnitsOccupied(v);
                  if (v <= 1) {
                    setNumSingole(1);
                    setNumDoppie(0);
                  }
                }}
              />
            </div>
            {unitsOccupied > 1 && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-md border bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-sm">Singole</Label>
                  <Input
                    type="number" min={0} max={unitsOccupied}
                    value={numSingole}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setNumSingole(v);
                      setNumDoppie(unitsOccupied - v);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Doppie</Label>
                  <Input
                    type="number" min={0} max={unitsOccupied}
                    value={numDoppie}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setNumDoppie(v);
                      setNumSingole(unitsOccupied - v);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dates with Calendar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkInDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    disabled={(date) => date < today}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Check-out *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !checkOutDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    disabled={(date) => {
                      const minDate = checkInDate ? new Date(checkInDate.getTime() + 86400000) : today;
                      return date < minDate;
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {duration > 0 && (
            <p className="text-sm text-muted-foreground">
              Durata: <strong>{duration} {duration === 1 ? (stayLabel === "notti" ? "notte" : "giorno") : stayLabel}</strong>
            </p>
          )}

          {/* Seasonal price calculation */}
          {seasonalCalc && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-1">
                <CardDescription className="font-medium">Calcolo soggiorno — {seasonalCalc.tariffName}</CardDescription>
                <div className="text-sm flex justify-between">
                  <span>Base ({duration} {stayLabel})</span>
                  <span>€ {seasonalCalc.baseCost.toFixed(2)}</span>
                </div>
                {seasonalCalc.supplement > 0 && (
                  <div className="text-sm flex justify-between">
                    <span>Suppl. gatto extra ({Math.max(0, selectedCats.length - 1)})</span>
                    <span>€ {seasonalCalc.supplement.toFixed(2)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Extra services */}
          <div className="space-y-3">
            <Label>Servizi extra</Label>
            {availableExtras.length > 0 && (
              <Select onValueChange={addExtraService} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Aggiungi servizio extra..." />
                </SelectTrigger>
                <SelectContent>
                  {availableExtras
                    .filter((pl: any) => !extraServices.find(s => s.priceListId === pl.id))
                    .map((pl: any) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} ({pl.tariff_type === "extra_giornaliero" ? "giornaliero" : pl.tariff_type === "extra_km" ? "km" : "una tantum"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {extraServices.length > 0 && (
              <div className="space-y-2">
                {extraServices.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{service.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {service.tariffType === "extra_giornaliero" ? "Giornaliero" : service.tariffType === "extra_km" ? "Km" : "Una tantum"}
                        </Badge>
                      </div>
                      {service.tariffType === "extra_giornaliero" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Giorni:</Label>
                          <Input
                            type="number" min={1} className="w-20 h-7 text-sm"
                            value={service.quantity}
                            onChange={(e) => updateExtraQuantity(idx, Number(e.target.value))}
                          />
                          <span className="text-xs text-muted-foreground">× € {service.unitCost.toFixed(2)}/giorno</span>
                        </div>
                      )}
                      {service.tariffType === "extra_km" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Km totali:</Label>
                          <Input
                            type="number" min={0} className="w-20 h-7 text-sm"
                            value={service.quantity}
                            onChange={(e) => updateExtraQuantity(idx, Number(e.target.value))}
                          />
                          <span className="text-xs text-muted-foreground">
                            (base € {service.fixedCost.toFixed(2)} + {service.includedKm} km inclusi, extra € {service.extraKmCost.toFixed(2)}/km)
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">€ {service.total.toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExtraService(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grand total calculation */}
          {(seasonalCalc || extraServices.length > 0) && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-1">
                {seasonalCalc && (
                  <div className="text-sm flex justify-between">
                    <span>Soggiorno</span>
                    <span>€ {seasonalCalc.total.toFixed(2)}</span>
                  </div>
                )}
                {extraServicesTotal > 0 && (
                  <div className="text-sm flex justify-between">
                    <span>Servizi extra</span>
                    <span>€ {extraServicesTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-sm font-bold flex justify-between border-t pt-1">
                  <span>Totale calcolato</span>
                  <span>€ {grandTotal.toFixed(2)}</span>
                </div>
                <div className="text-sm flex justify-between text-muted-foreground">
                  <span>Caparra (50%)</span>
                  <span>€ {(Math.round(grandTotal * 50) / 100).toFixed(2)}</span>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={applyCalculation}>
                  Applica al preventivo
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Manual total + deposit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Totale (€)</Label>
              <Input
                type="number" min={0} step={0.5}
                value={totalAmount}
                onChange={(e) => {
                  setTotalAmount(Number(e.target.value));
                  setDepositManuallySet(false);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Caparra richiesta (€)</Label>
              <Input
                type="number" min={0} step={0.5}
                value={depositAmount}
                onChange={(e) => {
                  setDepositAmount(Number(e.target.value));
                  setDepositManuallySet(true);
                }}
              />
              <p className="text-xs text-muted-foreground">Default: 50% del totale</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note aggiuntive..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={onCreate.isPending || onUpdate.isPending}>
            {editing ? "Aggiorna" : "Crea Preventivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
