import { useState, useRef } from "react";
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
import { Settings, Clock, Euro, CreditCard, Plus, Pencil, Trash2, Save, RotateCcw, Ban, Building2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useTenantConfig, useUpdateTenantConfig,
  useSlotConfigs, useUpsertSlotConfig, useDeleteSlotConfig,
  usePriceLists, useUpsertPriceList, useDeletePriceList,
  type TariffType,
} from "@/hooks/usePensioneConfig";
import {
  useAllPaymentMethods, useCreatePaymentMethod,
  useTogglePaymentMethod, useDeletePaymentMethod, useUpdatePaymentMethod,
} from "@/hooks/usePayments";
import { CancellationPolicyTab } from "@/components/pensione/CancellationPolicyTab";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const TARIFF_TYPE_LABELS: Record<TariffType, string> = {
  stagionale: "Stagionale",
  extra_giornaliero: "Extra giornaliero",
  extra_km: "Extra con km",
  extra_una_tantum: "Extra una tantum",
};

const SEASON_OPTIONS = [
  { value: "alta", label: "Alta stagione" },
  { value: "media", label: "Media stagione" },
  { value: "bassa", label: "Bassa stagione" },
];

export default function Pensione() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurazione Pensione</h1>
        <p className="text-muted-foreground text-sm mt-1">Anagrafica, casette, slot appuntamenti, listino prezzi, pagamenti e politica di cancellazione</p>
      </div>

      <Tabs defaultValue="anagrafica" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="anagrafica" className="gap-2"><Building2 className="h-4 w-4" /> Anagrafica</TabsTrigger>
          <TabsTrigger value="casette" className="gap-2"><Settings className="h-4 w-4" /> Casette</TabsTrigger>
          <TabsTrigger value="slot" className="gap-2"><Clock className="h-4 w-4" /> Slot Appuntamenti</TabsTrigger>
          <TabsTrigger value="listino" className="gap-2"><Euro className="h-4 w-4" /> Listino Prezzi</TabsTrigger>
          <TabsTrigger value="pagamenti" className="gap-2"><CreditCard className="h-4 w-4" /> Modalità Pagamento</TabsTrigger>
          <TabsTrigger value="cancellazione" className="gap-2"><Ban className="h-4 w-4" /> Cancellazione</TabsTrigger>
        </TabsList>

        <TabsContent value="anagrafica"><AnagraficaTab /></TabsContent>
        <TabsContent value="casette"><CasetteTab /></TabsContent>
        <TabsContent value="slot"><SlotTab /></TabsContent>
        <TabsContent value="listino"><ListinoTab /></TabsContent>
        <TabsContent value="pagamenti"><PaymentMethodsTab /></TabsContent>
        <TabsContent value="cancellazione"><CancellationPolicyTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── ANAGRAFICA TAB ──
function AnagraficaTab() {
  const { data: config, isLoading } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [cap, setCap] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [partitaIva, setPartitaIva] = useState<string | null>(null);
  const [pec, setPec] = useState<string | null>(null);
  const [titolareName, setTitolareName] = useState<string | null>(null);
  const [petType, setPetType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentName = name ?? config?.name ?? "";
  const currentEmail = email ?? config?.email ?? "";
  const currentPhone = phone ?? config?.phone ?? "";
  const currentAddress = address ?? config?.address ?? "";
  const currentCap = cap ?? (config as any)?.cap ?? "";
  const currentCity = city ?? (config as any)?.city ?? "";
  const currentPartitaIva = partitaIva ?? (config as any)?.partita_iva ?? "";
  const currentPec = pec ?? (config as any)?.pec ?? "";
  const currentTitolareName = titolareName ?? (config as any)?.titolare_name ?? "";
  const currentLogoUrl = (config as any)?.logo_url ?? null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${config.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("tenant-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("tenant-logos").getPublicUrl(path);
      await updateConfig.mutateAsync({ id: config.id, logo_url: urlData.publicUrl });
      toast.success("Logo caricato con successo");
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento del logo");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveLogo = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({ id: config.id, logo_url: null });
      toast.success("Logo rimosso");
    } catch (err: any) {
      toast.error(err.message || "Errore nella rimozione del logo");
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        email: currentEmail || null,
        phone: currentPhone || null,
        address: currentAddress || null,
        cap: currentCap || null,
        city: currentCity || null,
        partita_iva: currentPartitaIva || null,
        pec: currentPec || null,
        titolare_name: currentTitolareName || null,
      });
      toast.success("Anagrafica salvata");
      setName(null); setEmail(null); setPhone(null); setAddress(null);
      setCap(null); setCity(null);
      setPartitaIva(null); setPec(null); setTitolareName(null);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anagrafica Pensione</CardTitle>
        <CardDescription>Dati identificativi della pensione. Il codice pensione non è modificabile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Logo</Label>
          <div className="flex items-center gap-4">
            {currentLogoUrl ? (
              <div className="relative">
                <img src={currentLogoUrl} alt="Logo pensione" className="h-20 w-20 rounded-lg object-contain border bg-background" />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                <Building2 className="h-8 w-8" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Caricamento..." : "Carica logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG o SVG. Max 2MB.</p>
            </div>
          </div>
        </div>

        {/* Codice pensione (read-only) */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Codice Pensione</Label>
            <Input value={config?.slug ?? ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Non modificabile</p>
          </div>
          <div className="space-y-2">
            <Label>Nome Pensione</Label>
            <Input value={currentName} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Modificabile solo dall'amministratore</p>
          </div>
        </div>

        {/* Titolare */}
        <div className="space-y-2">
          <Label>Nominativo Titolare</Label>
          <Input value={currentTitolareName} onChange={(e) => setTitolareName(e.target.value)} placeholder="Nome e cognome del titolare" />
        </div>

        {/* Contatti */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={currentEmail} onChange={(e) => setEmail(e.target.value)} placeholder="email@pensione.it" />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input type="tel" value={currentPhone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 ..." />
          </div>
        </div>

        {/* P.IVA e PEC */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Partita IVA</Label>
            <Input value={currentPartitaIva} onChange={(e) => setPartitaIva(e.target.value)} placeholder="01234567890" />
          </div>
          <div className="space-y-2">
            <Label>PEC</Label>
            <Input type="email" value={currentPec} onChange={(e) => setPec(e.target.value)} placeholder="pec@pec.it" />
          </div>
        </div>

        {/* Indirizzo, CAP, Città */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label>Indirizzo</Label>
            <Input value={currentAddress} onChange={(e) => setAddress(e.target.value)} placeholder="Via Roma 1" />
          </div>
          <div className="space-y-2">
            <Label>CAP</Label>
            <Input value={currentCap} onChange={(e) => setCap(e.target.value)} placeholder="00100" maxLength={5} />
          </div>
          <div className="space-y-2">
            <Label>Città</Label>
            <Input value={currentCity} onChange={(e) => setCity(e.target.value)} placeholder="Roma" />
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salva Anagrafica
        </Button>
      </CardContent>
    </Card>
  );
}
function CasetteTab() {
  const { data: config, isLoading } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();
  const [singole, setSingole] = useState<number | null>(null);
  const [doppie, setDoppie] = useState<number | null>(null);
  const [maxCats, setMaxCats] = useState<number | null>(null);
  const [ruleDays, setRuleDays] = useState<number | null>(null);
  const [stayCalcType, setStayCalcType] = useState<string | null>(null);
  const [countCheckinDay, setCountCheckinDay] = useState<boolean | null>(null);
  const [countCheckoutDay, setCountCheckoutDay] = useState<boolean | null>(null);

  const s = singole ?? config?.num_singole ?? 0;
  const d = doppie ?? config?.num_doppie ?? 0;
  const mc = maxCats ?? (config as any)?.max_cats ?? 0;
  const r = ruleDays ?? config?.occupancy_rule_days ?? 4;
  const sct = stayCalcType ?? (config as any)?.stay_calc_type ?? "notti";
  const cid = countCheckinDay ?? (config as any)?.count_checkin_day ?? false;
  const cod = countCheckoutDay ?? (config as any)?.count_checkout_day ?? false;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        num_singole: s,
        num_doppie: d,
        max_cats: mc,
        occupancy_rule_days: r,
        stay_calc_type: sct,
        count_checkin_day: cid,
        count_checkout_day: cod,
      });
      toast.success("Configurazione casette salvata");
      setSingole(null);
      setDoppie(null);
      setMaxCats(null);
      setRuleDays(null);
      setStayCalcType(null);
      setCountCheckinDay(null);
      setCountCheckoutDay(null);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacità Casette</CardTitle>
        <CardDescription>Configura il numero di casette disponibili e la regola di occupazione</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="singole">Casette Singole</Label>
            <Input id="singole" type="number" min={0} value={s} onChange={(e) => setSingole(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Per 1 pet</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doppie">Casette Doppie</Label>
            <Input id="doppie" type="number" min={0} value={d} onChange={(e) => setDoppie(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Per 2+ pets fratelli</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxCats">Capienza max pets</Label>
            <Input id="maxCats" type="number" min={0} value={mc} onChange={(e) => setMaxCats(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Numero massimo di pets ospitabili</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule">Giorni occupazione minima</Label>
            <Input id="rule" type="number" min={1} max={30} value={r} onChange={(e) => setRuleDays(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Check-in occupa per N giorni</p>
          </div>
        </div>

        {/* Stay calculation config */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-base font-semibold">Calcolo durata soggiorno</Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipologia calcolo</Label>
              <Select value={sct} onValueChange={(v) => setStayCalcType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notti">Per notti</SelectItem>
                  <SelectItem value="giorni">Per giorni</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {sct === "notti" ? "Conta le notti tra check-in e check-out" : "Conta i giorni, configurando check-in/out"}
              </p>
            </div>
            {sct === "giorni" && (
              <>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={cid} onCheckedChange={(v) => setCountCheckinDay(v)} />
                  <div>
                    <Label>Conta giorno check-in</Label>
                    <p className="text-xs text-muted-foreground">Include la giornata di arrivo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={cod} onCheckedChange={(v) => setCountCheckoutDay(v)} />
                  <div>
                    <Label>Conta giorno check-out</Label>
                    <p className="text-xs text-muted-foreground">Include la giornata di partenza</p>
                  </div>
                </div>
              </>
            )}
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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState<number | "all">(0);
  const [appointmentType, setAppointmentType] = useState("check_in");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [duration, setDuration] = useState(30);
  const [maxAppts, setMaxAppts] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setDayOfWeek("all");
    setAppointmentType("check_in");
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
    setAppointmentType(slot.appointment_type ?? "check_in");
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
      const daysToSave = dayOfWeek === "all" && !editing
        ? [0, 1, 2, 3, 4, 5, 6]
        : [typeof dayOfWeek === "number" ? dayOfWeek : 0];

      for (const dow of daysToSave) {
        await upsertSlot.mutateAsync({
          id: editing?.id,
          tenant_id: profile.tenant_id,
          day_of_week: dow,
          appointment_type: appointmentType,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: duration,
          max_appointments: maxAppts,
          is_active: isActive,
        });
      }
      toast.success(editing ? "Slot aggiornato" : daysToSave.length > 1 ? "Slot creati per tutti i giorni" : "Slot creato");
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

  const handleReset = async () => {
    if (!profile?.tenant_id) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc("reset_tenant_slot_configs" as any, { _tenant_id: profile.tenant_id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["slot-configs"] });
      toast.success("Slot ripristinati ai valori predefiniti");
    } catch (err: any) {
      toast.error(err.message || "Errore nel ripristino");
    }
    setResetting(false);
    setResetConfirm(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Slot Appuntamenti</CardTitle>
            <CardDescription>Configura le fasce orarie per check-in e check-out</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setResetConfirm(true)} disabled={resetting}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Predefiniti
            </Button>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuovo Slot</Button>
          </div>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Giorno</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Durata</TableHead>
                    <TableHead>Max Clienti/Slot</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot: any) => (
                    <TableRow key={slot.id}>
                      <TableCell>
                        <Badge variant={slot.appointment_type === "check_in" ? "default" : "outline"}>
                          {slot.appointment_type === "check_in" ? "Check-in" : "Check-out"}
                        </Badge>
                      </TableCell>
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
              <Label>Tipo appuntamento</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="check_out">Check-out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Giorno della settimana</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(v === "all" ? "all" : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!editing && <SelectItem value="all">Tutti i giorni</SelectItem>}
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

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare gli slot predefiniti?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti gli slot attuali verranno eliminati e sostituiti con i valori predefiniti dal template globale. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ripristina
            </AlertDialogAction>
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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [tariffType, setTariffType] = useState<TariffType>("stagionale");
  const [season, setSeason] = useState("");
  const [pricePerDay, setPricePerDay] = useState(0);
  const [fixedCost, setFixedCost] = useState(0);
  const [includedKm, setIncludedKm] = useState(0);
  const [extraKmCost, setExtraKmCost] = useState(0);
  const [extraSupplement, setExtraSupplement] = useState(0);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [active, setActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setName("");
    setTariffType("stagionale");
    setSeason("");
    setPricePerDay(0);
    setFixedCost(0);
    setIncludedKm(0);
    setExtraKmCost(0);
    setExtraSupplement(0);
    setValidFrom("");
    setValidTo("");
    setActive(true);
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name);
    setTariffType(p.tariff_type ?? "stagionale");
    setSeason(p.season ?? "");
    setPricePerDay(p.price_per_day ?? 0);
    setFixedCost(p.fixed_cost ?? 0);
    setIncludedKm(p.included_km ?? 0);
    setExtraKmCost(p.extra_km_cost ?? 0);
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
        tariff_type: tariffType,
        season: tariffType === "stagionale" ? (season || null) : null,
        price_per_day: (tariffType === "stagionale" || tariffType === "extra_giornaliero") ? pricePerDay : 0,
        fixed_cost: tariffType === "extra_km" ? fixedCost : (tariffType === "extra_una_tantum" ? fixedCost : 0),
        included_km: tariffType === "extra_km" ? includedKm : 0,
        extra_km_cost: tariffType === "extra_km" ? extraKmCost : 0,
        extra_cat_supplement: tariffType === "stagionale" ? (extraSupplement || null) : null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        is_active: active,
      });
      toast.success(editing ? "Tariffa aggiornata" : "Tariffa creata");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deletePrice.mutateAsync(deleting.id);
      toast.success("Tariffa eliminata");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  const renderPriceInfo = (p: any) => {
    const tt = p.tariff_type ?? "stagionale";
    switch (tt) {
      case "stagionale":
        return `€ ${Number(p.price_per_day).toFixed(2)}/giorno`;
      case "extra_giornaliero":
        return `€ ${Number(p.price_per_day).toFixed(2)}/giorno`;
      case "extra_km":
        return `€ ${Number(p.fixed_cost).toFixed(2)} base + € ${Number(p.extra_km_cost).toFixed(2)}/km extra (incl. ${p.included_km} km)`;
      case "extra_una_tantum":
        return `€ ${Number(p.fixed_cost).toFixed(2)} una tantum`;
      default:
        return "—";
    }
  };

  const handleReset = async () => {
    if (!profile?.tenant_id) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc("reset_tenant_price_lists" as any, { _tenant_id: profile.tenant_id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Listino ripristinato ai valori predefiniti");
    } catch (err: any) {
      toast.error(err.message || "Errore nel ripristino");
    }
    setResetting(false);
    setResetConfirm(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Listino Prezzi</CardTitle>
            <CardDescription>Gestisci tariffe stagionali e servizi extra</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setResetConfirm(true)} disabled={resetting}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Predefiniti
            </Button>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuova Tariffa</Button>
          </div>
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
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {p.season && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {SEASON_OPTIONS.find(s => s.value === p.season)?.label ?? p.season}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TARIFF_TYPE_LABELS[p.tariff_type as TariffType] ?? p.tariff_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{renderPriceInfo(p)}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Tariffa" : "Nuova Tariffa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome tariffa</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Alta Stagione" />
              </div>
              <div className="space-y-2">
                <Label>Tipologia</Label>
                <Select value={tariffType} onValueChange={(v) => setTariffType(v as TariffType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TARIFF_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stagionale: season + price/day + supplement */}
            {tariffType === "stagionale" && (
              <>
                <div className="space-y-2">
                  <Label>Stagione</Label>
                  <Select value={season} onValueChange={setSeason}>
                    <SelectTrigger><SelectValue placeholder="Seleziona stagione" /></SelectTrigger>
                    <SelectContent>
                      {SEASON_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prezzo / giorno (€)</Label>
                    <Input type="number" min={0} step={0.5} value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Suppl. pet extra (€)</Label>
                    <Input type="number" min={0} step={0.5} value={extraSupplement} onChange={(e) => setExtraSupplement(Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            {/* Extra giornaliero: price/day */}
            {tariffType === "extra_giornaliero" && (
              <div className="space-y-2">
                <Label>Costo / giorno (€)</Label>
                <Input type="number" min={0} step={0.5} value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Es. somministrazione farmaci</p>
              </div>
            )}

            {/* Extra km: fixed + included km + extra/km */}
            {tariffType === "extra_km" && (
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Costo fisso (€)</Label>
                    <Input type="number" min={0} step={0.5} value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Km inclusi</Label>
                    <Input type="number" min={0} value={includedKm} onChange={(e) => setIncludedKm(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>€ / km extra</Label>
                    <Input type="number" min={0} step={0.1} value={extraKmCost} onChange={(e) => setExtraKmCost(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Es. Cat Taxi: costo fisso fino a X km, poi supplemento per km aggiuntivo</p>
              </div>
            )}

            {/* Extra una tantum: fixed cost */}
            {tariffType === "extra_una_tantum" && (
              <div className="space-y-2">
                <Label>Costo una tantum (€)</Label>
                <Input type="number" min={0} step={0.5} value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Es. visita veterinaria</p>
              </div>
            )}

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

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare il listino predefinito?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutte le tariffe attuali verranno eliminate e sostituite con i valori predefiniti dal template globale. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── MODALITÀ PAGAMENTO TAB ──
function PaymentMethodsTab() {
  const { profile } = useAuth();
  const { data: methods, isLoading } = useAllPaymentMethods();
  const createMethod = useCreatePaymentMethod();
  const toggleMethod = useTogglePaymentMethod();
  const deleteMethod = useDeletePaymentMethod();
  const updateMethod = useUpdatePaymentMethod();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createMethod.mutateAsync({
        name: newName.trim(),
        sort_order: (methods?.length ?? 0) + 1,
      });
      toast.success("Modalità di pagamento creata");
      setNewName("");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleUpdate = async () => {
    if (!editing || !editName.trim()) return;
    try {
      await updateMethod.mutateAsync({ id: editing.id, name: editName.trim() });
      toast.success("Modalità aggiornata");
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleMethod.mutateAsync({ id, is_active: !currentActive });
      toast.success(!currentActive ? "Attivata" : "Disattivata");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMethod.mutateAsync(deleting.id);
      toast.success("Modalità eliminata");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
    setDeleting(null);
  };

  const handleReset = async () => {
    if (!profile?.tenant_id) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc("reset_tenant_payment_methods" as any, { _tenant_id: profile.tenant_id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods-all"] });
      setEditing(null);
      toast.success("Metodi di pagamento ripristinati ai valori predefiniti");
    } catch (err: any) {
      toast.error(err.message || "Errore nel ripristino");
    }
    setResetting(false);
    setResetConfirm(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Modalità di Pagamento</CardTitle>
            <CardDescription>Configura i metodi di pagamento accettati (es. Contanti, Bonifico, Carta)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setResetConfirm(true)} disabled={resetting}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Predefiniti
            </Button>
            <Button onClick={() => { setNewName(""); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuova Modalità
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !methods?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna modalità configurata. Aggiungine almeno una per poter registrare i pagamenti.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[120px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "secondary"}>
                          {m.is_active ? "Attiva" : "Inattiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setEditName(m.name); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(m.id, m.is_active)}>
                            <Switch checked={m.is_active} className="pointer-events-none" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(m)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
            <DialogTitle>Nuova Modalità di Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Es. Contanti, Bonifico, Carta di credito..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={createMethod.isPending || !newName.trim()}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Modalità di Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={handleUpdate} disabled={updateMethod.isPending || !editName.trim()}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la modalità?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Stai per eliminare "${deleting.name}". Se è usata in pagamenti esistenti, potrebbe causare problemi.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare i metodi di pagamento predefiniti?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i metodi attuali verranno eliminati e sostituiti con i valori predefiniti dal template globale. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
