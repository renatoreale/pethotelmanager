import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil, Trash2, Search, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useClients } from "@/hooks/useClients";
import { usePriceLists } from "@/hooks/usePensioneConfig";
import {
  usePreventivi, useCreatePreventivo, useUpdatePreventivo,
  useDeletePreventivo, useConfirmPreventivo, useClientCats,
} from "@/hooks/usePreventivi";

export default function Preventivi() {
  const { data: preventivi, isLoading } = usePreventivi();
  const createPreventivo = useCreatePreventivo();
  const updatePreventivo = useUpdatePreventivo();
  const deletePreventivo = useDeletePreventivo();
  const confirmPreventivo = useConfirmPreventivo();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [confirming, setConfirming] = useState<any>(null);

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
                    <TableHead>Notti</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Data creazione</TableHead>
                    <TableHead className="w-[140px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const nights = differenceInDays(parseISO(p.check_out_date), parseISO(p.check_in_date));
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
                            {p.cage_pool_type === "singola" ? "Singola" : "Doppia"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_in_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_out_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{nights}</TableCell>
                        <TableCell className="font-medium">€ {Number(p.total_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(parseISO(p.created_at), "dd/MM/yy")}</TableCell>
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

      {/* Create/Edit Dialog */}
      <PreventivoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onCreate={createPreventivo}
        onUpdate={updatePreventivo}
      />

      {/* Confirm Dialog */}
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

      {/* Delete Dialog */}
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
  open, onOpenChange, editing, onCreate, onUpdate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any;
  onCreate: any;
  onUpdate: any;
}) {
  const { data: clients } = useClients();
  const { data: priceLists } = usePriceLists();

  const [clientId, setClientId] = useState("");
  const [cageType, setCageType] = useState<"singola" | "doppia">("singola");
  const [unitsOccupied, setUnitsOccupied] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [clientSearch, setClientSearch] = useState("");

  const { data: clientCats } = useClientCats(clientId || undefined);

  // Reset form when opening
  const resetForm = () => {
    if (editing) {
      setClientId(editing.client_id);
      setCageType(editing.cage_pool_type);
      setUnitsOccupied(editing.units_occupied);
      setCheckIn(editing.check_in_date);
      setCheckOut(editing.check_out_date);
      setSelectedCats(editing.booking_cats?.map((bc: any) => bc.cat_id) ?? []);
      setNotes(editing.notes ?? "");
      setTotalAmount(Number(editing.total_amount ?? 0));
      setDepositAmount(Number(editing.deposit_amount ?? 0));
    } else {
      setClientId("");
      setCageType("singola");
      setUnitsOccupied(1);
      setCheckIn("");
      setCheckOut("");
      setSelectedCats([]);
      setNotes("");
      setTotalAmount(0);
      setDepositAmount(0);
    }
    setClientSearch("");
  };

  // Reset on open/editing change
  useState(() => { resetForm(); });

  // Auto-calculate price
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
  }, [checkIn, checkOut]);

  const calculatedPrice = useMemo(() => {
    if (!priceLists || nights <= 0) return null;

    // Find active seasonal tariff matching dates
    const seasonalTariffs = priceLists.filter(
      (pl: any) => pl.tariff_type === "stagionale" && pl.is_active
    );

    if (seasonalTariffs.length === 0) return null;

    // Pick best match (first active one for simplicity)
    const tariff = seasonalTariffs[0];
    const baseCost = Number(tariff.price_per_day) * nights;
    const extraCats = Math.max(0, selectedCats.length - 1);
    const supplement = extraCats * Number(tariff.extra_cat_supplement ?? 0) * nights;

    return { baseCost, supplement, total: baseCost + supplement, tariffName: tariff.name };
  }, [priceLists, nights, selectedCats.length]);

  const applyCalculation = () => {
    if (calculatedPrice) {
      setTotalAmount(calculatedPrice.total);
    }
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

    try {
      if (editing) {
        await onUpdate.mutateAsync({
          id: editing.id,
          client_id: clientId,
          cage_pool_type: cageType,
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
          cage_pool_type: cageType,
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

  // Reset form when dialog opens
  useMemo(() => {
    if (open) resetForm();
  }, [open, editing]);

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

          {/* Cage type + units */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo casetta</Label>
              <Select value={cageType} onValueChange={(v) => setCageType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="singola">Singola</SelectItem>
                  <SelectItem value="doppia">Doppia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Casette occupate</Label>
              <Input type="number" min={1} max={10} value={unitsOccupied} onChange={(e) => setUnitsOccupied(Number(e.target.value))} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in *</Label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check-out *</Label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          {nights > 0 && (
            <p className="text-sm text-muted-foreground">
              Durata: <strong>{nights} nott{nights === 1 ? "e" : "i"}</strong>
            </p>
          )}

          {/* Price calculation */}
          {calculatedPrice && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-1">
                <CardDescription className="font-medium">Calcolo automatico — {calculatedPrice.tariffName}</CardDescription>
                <div className="text-sm flex justify-between">
                  <span>Base ({nights} notti)</span>
                  <span>€ {calculatedPrice.baseCost.toFixed(2)}</span>
                </div>
                {calculatedPrice.supplement > 0 && (
                  <div className="text-sm flex justify-between">
                    <span>Suppl. gatto extra ({Math.max(0, selectedCats.length - 1)} gatt{selectedCats.length - 1 === 1 ? "o" : "i"})</span>
                    <span>€ {calculatedPrice.supplement.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-sm font-bold flex justify-between border-t pt-1">
                  <span>Totale calcolato</span>
                  <span>€ {calculatedPrice.total.toFixed(2)}</span>
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
              <Input type="number" min={0} step={0.5} value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Caparra richiesta (€)</Label>
              <Input type="number" min={0} step={0.5} value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} />
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
