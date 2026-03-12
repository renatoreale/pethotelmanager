import { useState, useRef } from "react";
import {
  useClienteProfile,
  useClienteCats,
  useCreateClienteCat,
  useUpdateClienteCat,
  useDeleteClienteCat,
  useClienteTenant,
} from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, PawPrint, Camera, X } from "lucide-react";
import { BreedCombobox } from "@/components/BreedCombobox";
import { supabase } from "@/integrations/supabase/client";

interface CatForm {
  name: string;
  breed: string;
  color: string;
  birth_date: string;
  gender: string;
  microchip: string;
  weight_kg: string;
  is_neutered: boolean;
  medical_notes: string;
  dietary_notes: string;
  behavioral_notes: string;
  pet_type: string;
}

const emptyForm: CatForm = {
  name: "", breed: "", color: "", birth_date: "", gender: "",
  microchip: "", weight_kg: "", is_neutered: false,
  medical_notes: "", dietary_notes: "", behavioral_notes: "", pet_type: "",
};

export default function ClienteAnimali() {
  const { data: profile } = useClienteProfile();
  const { data: cats, isLoading } = useClienteCats();
  const { data: tenant } = useClienteTenant();
  const createCat = useCreateClienteCat();
  const updateCat = useUpdateClienteCat();
  const deleteCat = useDeleteClienteCat();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEntrambi = tenant?.pet_type === "entrambi";

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, pet_type: tenant?.pet_type === "cani" ? "cani" : "gatti" });
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name || "",
      breed: cat.breed || "",
      color: cat.color || "",
      birth_date: cat.birth_date || "",
      gender: cat.gender || "",
      microchip: cat.microchip || "",
      weight_kg: cat.weight_kg?.toString() || "",
      is_neutered: cat.is_neutered || false,
      medical_notes: cat.medical_notes || "",
      dietary_notes: cat.dietary_notes || "",
      behavioral_notes: cat.behavioral_notes || "",
      pet_type: cat.pet_type || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !profile) return;

    const payload: any = {
      name: form.name.trim(),
      breed: form.breed || null,
      color: form.color || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      microchip: form.microchip || null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      is_neutered: form.is_neutered,
      medical_notes: form.medical_notes || null,
      dietary_notes: form.dietary_notes || null,
      behavioral_notes: form.behavioral_notes || null,
      pet_type: isEntrambi ? form.pet_type : (tenant?.pet_type || null),
    };

    try {
      if (editingId) {
        await updateCat.mutateAsync({ id: editingId, ...payload });
        toast.success("Animale aggiornato");
      } else {
        await createCat.mutateAsync({
          ...payload,
          client_id: profile.id,
          tenant_id: profile.tenant_id,
        });
        toast.success("Animale aggiunto");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo animale?")) return;
    try {
      await deleteCat.mutateAsync(id);
      toast.success("Animale eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold">I Miei Animali</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      {(!cats || cats.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <PawPrint className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nessun animale registrato</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aggiungi i tuoi animali per poter richiedere preventivi
            </p>
            <Button className="mt-4" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi il primo animale
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {cats?.map((cat: any) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                  {cat.pet_type === "cani" ? "🐕" : "🐱"}
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[cat.breed, cat.color, cat.gender === "M" ? "Maschio" : cat.gender === "F" ? "Femmina" : null]
                      .filter(Boolean)
                      .join(" · ") || "Nessun dettaglio"}
                  </p>
                  {cat.microchip && (
                    <p className="text-[10px] text-muted-foreground">Microchip: {cat.microchip}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica Animale" : "Nuovo Animale"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isEntrambi && (
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.pet_type} onValueChange={(v) => setForm({ ...form, pet_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gatti">🐱 Gatto</SelectItem>
                    <SelectItem value="cani">🐕 Cane</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razza</Label>
                <BreedCombobox value={form.breed} onChange={(v) => setForm({ ...form, breed: v })} petType={form.pet_type || tenant?.pet_type} />
              </div>
              <div className="space-y-2">
                <Label>Colore</Label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data di nascita</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sesso</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Microchip</Label>
                <Input value={form.microchip} onChange={(e) => setForm({ ...form, microchip: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_neutered} onCheckedChange={(c) => setForm({ ...form, is_neutered: c })} />
              <Label>Sterilizzato/a</Label>
            </div>

            <div className="space-y-2">
              <Label>Note mediche</Label>
              <Textarea value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Note alimentari</Label>
              <Textarea value={form.dietary_notes} onChange={(e) => setForm({ ...form, dietary_notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Note comportamentali</Label>
              <Textarea value={form.behavioral_notes} onChange={(e) => setForm({ ...form, behavioral_notes: e.target.value })} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || createCat.isPending || updateCat.isPending}>
              {editingId ? "Salva" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
