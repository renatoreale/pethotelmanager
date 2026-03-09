import { useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGlobalPriceLists, useUpsertGlobalPriceList, useDeleteGlobalPriceList,
} from "@/hooks/useGlobalConfig";

type TariffType = "stagionale" | "extra_giornaliero" | "extra_km" | "extra_una_tantum";

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

const PET_TYPE_LABELS: Record<string, string> = {
  gatti: "🐱 Gatti",
  cani: "🐶 Cani",
};

export function GlobalPriceListsTab() {
  const { data: priceLists, isLoading } = useGlobalPriceLists();
  const upsert = useUpsertGlobalPriceList();
  const remove = useDeleteGlobalPriceList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const [name, setName] = useState("");
  const [tariffType, setTariffType] = useState<TariffType>("stagionale");
  const [season, setSeason] = useState<string | null>(null);
  const [pricePerDay, setPricePerDay] = useState(0);
  const [extraCatSupplement, setExtraCatSupplement] = useState(0);
  const [fixedCost, setFixedCost] = useState(0);
  const [includedKm, setIncludedKm] = useState(0);
  const [extraKmCost, setExtraKmCost] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [petType, setPetType] = useState<"gatti" | "cani">("gatti");

  const openNew = () => {
    setEditing(null);
    setName("");
    setTariffType("stagionale");
    setSeason(null);
    setPricePerDay(0);
    setExtraCatSupplement(0);
    setFixedCost(0);
    setIncludedKm(0);
    setExtraKmCost(0);
    setIsActive(true);
    setPetType("gatti");
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name);
    setTariffType(p.tariff_type);
    setSeason(p.season);
    setPricePerDay(p.price_per_day || 0);
    setExtraCatSupplement(p.extra_cat_supplement || 0);
    setFixedCost(p.fixed_cost || 0);
    setIncludedKm(p.included_km || 0);
    setExtraKmCost(p.extra_km_cost || 0);
    setIsActive(p.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Inserisci un nome"); return; }
    await upsert.mutateAsync({
      id: editing?.id,
      name: name.trim(),
      tariff_type: tariffType,
      season: tariffType === "stagionale" ? season : null,
      price_per_day: pricePerDay,
      extra_cat_supplement: extraCatSupplement,
      fixed_cost: fixedCost,
      included_km: includedKm,
      extra_km_cost: extraKmCost,
      is_active: isActive,
    });
    toast.success(editing ? "Tariffa globale aggiornata" : "Tariffa globale creata");
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleting) {
      await remove.mutateAsync(deleting);
      toast.success("Tariffa globale eliminata");
      setDeleting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Listino Prezzi (Template Globale)</CardTitle>
            <CardDescription>
              Queste tariffe verranno copiate automaticamente in ogni nuova pensione creata
            </CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuova Tariffa</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !priceLists?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna tariffa globale configurata</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Stagione</TableHead>
                    <TableHead>€/giorno</TableHead>
                    <TableHead>Suppl. pet extra</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{TARIFF_TYPE_LABELS[p.tariff_type as TariffType] || p.tariff_type}</Badge></TableCell>
                      <TableCell>{p.season ? SEASON_OPTIONS.find(s => s.value === p.season)?.label || p.season : "-"}</TableCell>
                      <TableCell>€{p.price_per_day}</TableCell>
                      <TableCell>{p.extra_cat_supplement ? `€${p.extra_cat_supplement}` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "outline"}>
                          {p.is_active ? "Attivo" : "Disattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Modifica Tariffa Globale" : "Nuova Tariffa Globale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Alta stagione singola" /></div>
            <div className="space-y-2">
              <Label>Tipo tariffa</Label>
              <Select value={tariffType} onValueChange={(v) => setTariffType(v as TariffType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TARIFF_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tariffType === "stagionale" && (
              <div className="space-y-2">
                <Label>Stagione</Label>
                <Select value={season || ""} onValueChange={(v) => setSeason(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona stagione..." /></SelectTrigger>
                  <SelectContent>
                    {SEASON_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>€/giorno</Label><Input type="number" min={0} step={0.01} value={pricePerDay} onChange={(e) => setPricePerDay(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Suppl. pet extra €</Label><Input type="number" min={0} step={0.01} value={extraCatSupplement} onChange={(e) => setExtraCatSupplement(Number(e.target.value))} /></div>
            </div>
            {tariffType === "extra_km" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Km inclusi</Label><Input type="number" min={0} value={includedKm} onChange={(e) => setIncludedKm(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>€/km extra</Label><Input type="number" min={0} step={0.01} value={extraKmCost} onChange={(e) => setExtraKmCost(Number(e.target.value))} /></div>
              </div>
            )}
            {tariffType === "extra_una_tantum" && (
              <div className="space-y-2"><Label>Costo fisso €</Label><Input type="number" min={0} step={0.01} value={fixedCost} onChange={(e) => setFixedCost(Number(e.target.value))} /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Attivo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{editing ? "Salva" : "Crea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la tariffa globale?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione non influenzerà le pensioni già create.</AlertDialogDescription>
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
