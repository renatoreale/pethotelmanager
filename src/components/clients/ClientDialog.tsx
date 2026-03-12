import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Cat, Dog, PawPrint } from "lucide-react";
import { useCreateClient, useUpdateClient, type Client } from "@/hooks/useClients";
import { useCreateCat, useCats, useDeleteCat, useUpdateCat } from "@/hooks/useCats";
import { supabase } from "@/integrations/supabase/client";
import { usePetLabels, type PetType } from "@/hooks/usePetLabels";
import { BreedCombobox } from "@/components/BreedCombobox";

const clientSchema = z.object({
  first_name: z.string().trim().min(1, "Nome obbligatorio").max(100),
  last_name: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(255).or(z.literal("")).optional(),
  phone: z.string().trim().max(50).optional(),
  fiscal_code: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  is_blacklisted: z.boolean().default(false),
  blacklist_reason: z.string().trim().max(500).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface InlineCat {
  id?: string; // existing cat id
  name: string;
  breed: string;
  color: string;
  gender: string;
  birth_date: string;
  microchip: string;
  weight_kg: string;
  is_neutered: boolean;
  needs_double_cage: boolean;
  medical_notes: string;
  dietary_notes: string;
  behavioral_notes: string;
  pet_type?: PetType;
  _deleted?: boolean; // mark for deletion
}

const emptyCat = (defaultPetType?: PetType): InlineCat => ({
  name: "",
  breed: "",
  color: "",
  gender: "",
  birth_date: "",
  microchip: "",
  weight_kg: "",
  is_neutered: false,
  needs_double_cage: false,
  medical_notes: "",
  dietary_notes: "",
  behavioral_notes: "",
  pet_type: defaultPetType,
});

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { profile } = useAuth();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const createCat = useCreateCat();
  const updateCatMut = useUpdateCat();
  const deleteCatMut = useDeleteCat();
  const pet = usePetLabels();
  const isEditing = !!client;

  const { data: existingCats } = useCats(client?.id);

  const defaultAnimalType: PetType | undefined = pet.petType === "entrambi" ? undefined : pet.petType;
  const [cats, setCats] = useState<InlineCat[]>([emptyCat(defaultAnimalType)]);
  const [saving, setSaving] = useState(false);

  // Load existing cats when editing
  useEffect(() => {
    if (isEditing && existingCats && existingCats.length > 0) {
      setCats(
        existingCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          breed: c.breed ?? "",
          color: c.color ?? "",
          gender: c.gender ?? "",
          birth_date: c.birth_date ?? "",
          microchip: c.microchip ?? "",
          weight_kg: c.weight_kg != null ? String(c.weight_kg) : "",
          is_neutered: c.is_neutered ?? false,
          needs_double_cage: c.needs_double_cage ?? false,
          medical_notes: c.medical_notes ?? "",
          dietary_notes: c.dietary_notes ?? "",
          behavioral_notes: c.behavioral_notes ?? "",
          pet_type: c.pet_type ?? defaultAnimalType,
        }))
      );
    } else if (!isEditing) {
      setCats([emptyCat(defaultAnimalType)]);
    }
  }, [isEditing, existingCats]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      fiscal_code: "",
      address: "",
      notes: "",
      is_blacklisted: false,
      blacklist_reason: "",
    },
  });

  // Reset form values when client changes (edit vs new)
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: client?.first_name ?? "",
        last_name: client?.last_name ?? "",
        email: client?.email ?? "",
        phone: client?.phone ?? "",
        fiscal_code: client?.fiscal_code ?? "",
        address: client?.address ?? "",
        notes: client?.notes ?? "",
        is_blacklisted: client?.is_blacklisted ?? false,
        blacklist_reason: client?.blacklist_reason ?? "",
      });
    }
  }, [open, client]);

  const isBlacklisted = form.watch("is_blacklisted");
  const addCat = () => setCats((prev) => [...prev, emptyCat(defaultAnimalType)]);

  const removeCat = (index: number) => {
    setCats((prev) => {
      const cat = prev[index];
      if (cat.id) {
        // Mark existing cat for deletion
        return prev.map((c, i) => (i === index ? { ...c, _deleted: true } : c));
      }
      // Remove new cat from list
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateCat = (index: number, field: keyof InlineCat, value: any) => {
    setCats((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const visibleCats = cats.filter((c) => !c._deleted);

  const onSubmit = async (values: ClientFormValues) => {
    // Validate at least one cat with a name
    const activeCats = cats.filter((c) => !c._deleted);
    const validCats = activeCats.filter((c) => c.name.trim());
    if (validCats.length === 0) {
      toast.error(`Aggiungi almeno ${pet.indefiniteSingular} con un nome`);
      return;
    }
    // Validate pet_type for "entrambi" tenants
    if (pet.petType === "entrambi") {
      const missingType = validCats.some((c) => !c.pet_type);
      if (missingType) {
        toast.error("Seleziona il tipo di animale per ciascun pet");
        return;
      }
    }

    setSaving(true);
    try {
      let clientId: string;

      if (isEditing && client) {
        await updateClient.mutateAsync({
          id: client.id,
          ...values,
          email: values.email || null,
          phone: values.phone || null,
          fiscal_code: values.fiscal_code || null,
          address: values.address || null,
          notes: values.notes || null,
          blacklist_reason: values.is_blacklisted ? (values.blacklist_reason || null) : null,
        });
        clientId = client.id;
      } else {
        const result = await createClient.mutateAsync({
          first_name: values.first_name,
          last_name: values.last_name,
          is_blacklisted: values.is_blacklisted,
          tenant_id: profile?.tenant_id!,
          email: values.email || null,
          phone: values.phone || null,
          fiscal_code: values.fiscal_code || null,
          address: values.address || null,
          notes: values.notes || null,
          blacklist_reason: values.is_blacklisted ? (values.blacklist_reason || null) : null,
        });
        clientId = result.id;
      }

      // Process cats
      for (const cat of cats) {
        const catPayload = {
          tenant_id: profile?.tenant_id!,
          client_id: clientId,
          name: cat.name.trim(),
          breed: cat.breed || null,
          color: cat.color || null,
          gender: cat.gender || null,
          birth_date: cat.birth_date || null,
          microchip: cat.microchip || null,
          weight_kg: cat.weight_kg ? parseFloat(cat.weight_kg) : null,
          is_neutered: cat.is_neutered,
          needs_double_cage: cat.needs_double_cage,
          medical_notes: cat.medical_notes || null,
          dietary_notes: cat.dietary_notes || null,
          behavioral_notes: cat.behavioral_notes || null,
          sibling_group_id: null,
          pet_type: cat.pet_type || defaultAnimalType || null,
        };

        if (cat._deleted && cat.id) {
          await deleteCatMut.mutateAsync(cat.id);
        } else if (cat.id) {
          await updateCatMut.mutateAsync({ id: cat.id, ...catPayload });
        } else if (cat.name.trim()) {
          await createCat.mutateAsync(catPayload);
        }
      }

      toast.success(isEditing ? `Cliente e ${pet.plural} aggiornati` : `Cliente e ${pet.plural} creati`);
      onOpenChange(false);
      form.reset();
      setCats([emptyCat(defaultAnimalType)]);
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? `Modifica Cliente & ${pet.pluralCap}` : `Nuovo Cliente & ${pet.pluralCap}`}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Client fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="first_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input placeholder="Mario" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="last_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cognome *</FormLabel>
                  <FormControl><Input placeholder="Rossi" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="mario@email.it" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl><Input placeholder="+39 333 1234567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="fiscal_code" render={({ field }) => (
              <FormItem>
                <FormLabel>Codice Fiscale</FormLabel>
                <FormControl><Input placeholder="RSSMRA80A01H501Z" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl><Input placeholder="Via Roma 1, Milano" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl><Textarea placeholder="Note sul cliente..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Blacklist */}
            <div className="border-t pt-3 space-y-3">
              <FormField control={form.control} name="is_blacklisted" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <Label className="text-sm font-medium text-destructive">Blacklist</Label>
                </FormItem>
              )} />
              {isBlacklisted && (
                <FormField control={form.control} name="blacklist_reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo blacklist</FormLabel>
                    <FormControl><Textarea placeholder="Motivo..." rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            {/* Cats Section */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {pet.petType === "cani" ? <Dog className="h-4 w-4 text-primary" /> : pet.petType === "gatti" ? <Cat className="h-4 w-4 text-primary" /> : <PawPrint className="h-4 w-4 text-primary" />}
                  {pet.pluralCap} ({visibleCats.length})
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addCat}>
                  <Plus className="mr-1 h-3 w-3" /> Aggiungi {pet.singular}
                </Button>
              </div>

              {cats.map((cat, index) => {
                if (cat._deleted) return null;
                return (
                  <div key={index} className="rounded-lg border bg-muted/30 p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {cat.pet_type === "cani" ? "Cane" : cat.pet_type === "gatti" ? "Gatto" : pet.singularCap} {visibleCats.indexOf(cat) + 1}
                      </span>
                      {visibleCats.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeCat(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {pet.petType === "entrambi" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo animale *</Label>
                        <Select
                          value={cat.pet_type || ""}
                          onValueChange={(v) => updateCat(index, "pet_type", v as PetType)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleziona..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gatti">🐱 Gatto</SelectItem>
                            <SelectItem value="cani">🐶 Cane</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input
                          placeholder="Luna"
                          value={cat.name}
                          onChange={(e) => updateCat(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Razza</Label>
                        <BreedCombobox
                          value={cat.breed}
                          onChange={(v) => updateCat(index, "breed", v)}
                          petType={cat.pet_type || (pet.petType !== "entrambi" ? pet.petType : undefined)}
                          placeholder="Europeo"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Colore</Label>
                        <Input
                          placeholder="Tigrato"
                          value={cat.color}
                          onChange={(e) => updateCat(index, "color", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Sesso</Label>
                        <Select
                          value={cat.gender}
                          onValueChange={(v) => updateCat(index, "gender", v)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Maschio</SelectItem>
                            <SelectItem value="F">Femmina</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="4.5"
                          value={cat.weight_kg}
                          onChange={(e) => updateCat(index, "weight_kg", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data nascita</Label>
                        <Input
                          type="date"
                          value={cat.birth_date}
                          onChange={(e) => updateCat(index, "birth_date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Microchip</Label>
                        <Input
                          placeholder="380..."
                          value={cat.microchip}
                          onChange={(e) => updateCat(index, "microchip", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cat.is_neutered}
                          onCheckedChange={(v) => updateCat(index, "is_neutered", v)}
                        />
                        <Label className="text-xs">Sterilizzato</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cat.needs_double_cage}
                          onCheckedChange={(v) => updateCat(index, "needs_double_cage", v)}
                        />
                        <Label className="text-xs">Casetta doppia</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Note mediche</Label>
                        <Textarea
                          placeholder="Allergie..."
                          rows={2}
                          value={cat.medical_notes}
                          onChange={(e) => updateCat(index, "medical_notes", e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Note dietetiche</Label>
                        <Textarea
                          placeholder="Cibo..."
                          rows={2}
                          value={cat.dietary_notes}
                          onChange={(e) => updateCat(index, "dietary_notes", e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Note comportamentali</Label>
                        <Textarea
                          placeholder="Carattere..."
                          rows={2}
                          value={cat.behavioral_notes}
                          onChange={(e) => updateCat(index, "behavioral_notes", e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : `Salva Cliente & ${pet.pluralCap}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
