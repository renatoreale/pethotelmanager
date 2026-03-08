import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Settings, Clock, Euro, Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useTenantConfig, useUpdateTenantConfig,
  useSlotConfigs, useUpsertSlotConfig, useDeleteSlotConfig,
  usePriceLists, useUpsertPriceList, useDeletePriceList,
} from "@/hooks/usePensioneConfig";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function Pensione() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurazione Pensione</h1>
        <p className="text-muted-foreground text-sm mt-1">Gabbie, slot appuntamenti e listino prezzi</p>
      </div>

      <Tabs defaultValue="gabbie" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gabbie" className="gap-2"><Settings className="h-4 w-4" /> Gabbie</TabsTrigger>
          <TabsTrigger value="slot" className="gap-2"><Clock className="h-4 w-4" /> Slot Appuntamenti</TabsTrigger>
          <TabsTrigger value="listino" className="gap-2"><Euro className="h-4 w-4" /> Listino Prezzi</TabsTrigger>
        </TabsList>

        <TabsContent value="gabbie"><GabbieTab /></TabsContent>
        <TabsContent value="slot"><SlotTab /></TabsContent>
        <TabsContent value="listino"><ListinoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── GABBIE TAB ──
function GabbieTab() {
  const { data: config, isLoading } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();
  const [singole, setSingole] = useState<number | null>(null);
  const [doppie, setDoppie] = useState<number | null>(null);
  const [ruleDays, setRuleDays] = useState<number | null>(null);

  const s = singole ?? config?.num_singole ?? 0;
  const d = doppie ?? config?.num_doppie ?? 0;
  const r = ruleDays ?? config?.occupancy_rule_days ?? 4;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        num_singole: s,
        num_doppie: d,
        occupancy_rule_days: r,
      });
      toast.success("Configurazione gabbie salvata");
      setSingole(null);
      setDoppie(null);
      setRuleDays(null);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacità Gabbie</CardTitle>
        <CardDescription>Configura il numero di gabbie disponibili e la regola di occupazione</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="singole">Gabbie Singole</Label>
            <Input id="singole" type="number" min={0} value={s} onChange={(e) => setSingole(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Per 1 gatto</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doppie">Gabbie Doppie</Label>
            <Input id="doppie" type="number" min={0} value={d} onChange={(e) => setDoppie(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Per 2+ gatti fratelli</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule">Giorni occupazione minima</Label>
            <Input id="rule" type="number" min={1} max={30} value={r} onChange={(e) => setRuleDays(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Check-in occupa per N giorni</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salva Configurazione
        </Button>
      </CardContent>
    </Card>
  );
}

// ── SLOT TAB ──
function SlotTab() {
  const { profile } = useAuth();
  const { data: slots, isLoading } = useSlotConfigs();
  const upsertSlot = useUpsertSlotConfig();
  const deleteSlot = useDeleteSlotConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [duration, setDuration] = useState(30);
  const [maxAppts, setMaxAppts] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setDayOfWeek(0);
    setStartTime("09:00");
    setEndTime("12:00");
    setDuration(30);
    setMaxAppts(1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (slot: any) => {
    setEditing(slot);
    setDayOfWeek(slot.day_of_week);
    setStartTime(slot.start_time.slice(0, 5));
    setEndTime(slot.end_time.slice(0, 5));
    setDuration(slot.slot_duration_minutes);
    setMaxAppts(slot.max_appointments);
    setIsActive(slot.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.tenant_id) return;
    try {
      await upsertSlot.mutateAsync({
        id: editing?.id,
        tenant_id: profile.tenant_id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: duration,
        max_appointments: maxAppts,
        is_active: isActive,
      });
      toast.success(editing ? "Slot aggiornato" : "Slot creato");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSlot.mutateAsync(deleting.id);
      toast.success("Slot eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Slot Appuntamenti</CardTitle>
            <CardDescription>Configura le fasce orarie per check-in e check-out</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuovo Slot</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !slots?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuno slot configurato</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giorno</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Durata</TableHead>
                    <TableHead>Max Appt.</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot: any) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{DAYS[slot.day_of_week] ?? slot.day_of_week}</TableCell>
                      <TableCell>{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</TableCell>
                      <TableCell>{slot.slot_duration_minutes} min</TableCell>
                      <TableCell>{slot.max_appointments}</TableCell>
                      <TableCell>
                        <Badge variant={slot.is_active ? "default" : "secondary"}>
                          {slot.is_active ? "Attivo" : "Inattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(slot)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(slot)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Slot" : "Nuovo Slot"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Giorno della settimana</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inizio</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fine</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durata slot (min)</Label>
                <Input type="number" min={10} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Max appuntamenti</Label>
                <Input type="number" min={1} max={20} value={maxAppts} onChange={(e) => setMaxAppts(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={upsertSlot.isPending}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare lo slot?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── LISTINO TAB ──
function ListinoTab() {
  const { profile } = useAuth();
  const { data: prices, isLoading } = usePriceLists();
  const upsertPrice = useUpsertPriceList();
  const deletePrice = useDeletePriceList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  // Form
  const [name, setName] = useState("");
  const [cageType, setCageType] = useState<"singola" | "doppia">("singola");
  const [pricePerDay, setPricePerDay] = useState(0);
  const [extraSupplement, setExtraSupplement] = useState(0);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [active, setActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setName("");
    setCageType("singola");
    setPricePerDay(0);
    setExtraSupplement(0);
    setValidFrom("");
    setValidTo("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name);
    setCageType(p.cage_pool_type);
    setPricePerDay(p.price_per_day);
    setExtraSupplement(p.extra_cat_supplement ?? 0);
    setValidFrom(p.valid_from ?? "");
    setValidTo(p.valid_to ?? "");
    setActive(p.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome obbligatorio"); return; }
    try {
      await upsertPrice.mutateAsync({
        id: editing?.id,
        tenant_id: profile?.tenant_id,
        name: name.trim(),
        cage_pool_type: cageType,
        price_per_day: pricePerDay,
        extra_cat_supplement: extraSupplement || null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        is_active: active,
      });
      toast.success(editing ? "Listino aggiornato" : "Listino creato");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deletePrice.mutateAsync(deleting.id);
      toast.success("Listino eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Listino Prezzi</CardTitle>
            <CardDescription>Gestisci le tariffe per tipo gabbia con validità temporale</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuova Tariffa</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !prices?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna tariffa configurata</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>€/giorno</TableHead>
                    <TableHead>Suppl. extra</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={p.cage_pool_type === "doppia" ? "outline" : "secondary"}>
                          {p.cage_pool_type === "singola" ? "Singola" : "Doppia"}
                        </Badge>
                      </TableCell>
                      <TableCell>€ {Number(p.price_per_day).toFixed(2)}</TableCell>
                      <TableCell>{p.extra_cat_supplement ? `€ ${Number(p.extra_cat_supplement).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {p.valid_from && p.valid_to
                          ? `${p.valid_from} → ${p.valid_to}`
                          : p.valid_from ? `dal ${p.valid_from}` : "Sempre"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Attivo" : "Inattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Tariffa" : "Nuova Tariffa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome tariffa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Tariffa Base Estate" />
            </div>
            <div className="space-y-2">
              <Label>Tipo gabbia</Label>
              <Select value={cageType} onValueChange={(v) => setCageType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="singola">Singola</SelectItem>
                  <SelectItem value="doppia">Doppia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prezzo / giorno (€)</Label>
                <Input type="number" min={0} step={0.5} value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Suppl. gatto extra (€)</Label>
                <Input type="number" min={0} step={0.5} value={extraSupplement} onChange={(e) => setExtraSupplement(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valido dal</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valido al</Label>
                <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={upsertPrice.isPending}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la tariffa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Stai per eliminare "${deleting.name}". Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
