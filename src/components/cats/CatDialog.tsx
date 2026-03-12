import { useState } from "react";
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
import { toast } from "sonner";
import { useCreateCat, useUpdateCat, type Cat } from "@/hooks/useCats";
import { useClients } from "@/hooks/useClients";
import { usePetLabels, type PetType } from "@/hooks/usePetLabels";

const catSchema = z.object({
  name: z.string().trim().min(1, "Nome obbligatorio").max(100),
  client_id: z.string().min(1, "Seleziona un cliente"),
  breed: z.string().trim().max(100).optional(),
  color: z.string().trim().max(50).optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  microchip: z.string().trim().max(30).optional(),
  weight_kg: z.coerce.number().min(0).max(30).optional().or(z.literal("")),
  is_neutered: z.boolean().default(false),
  medical_notes: z.string().trim().max(2000).optional(),
  dietary_notes: z.string().trim().max(2000).optional(),
  behavioral_notes: z.string().trim().max(2000).optional(),
  needs_double_cage: z.boolean().default(false),
  pet_type: z.string().optional(),
});

type CatFormValues = z.infer<typeof catSchema>;

interface CatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cat?: any | null;
  defaultClientId?: string;
}

export function CatDialog({ open, onOpenChange, cat, defaultClientId }: CatDialogProps) {
  const { profile } = useAuth();
  const createCat = useCreateCat();
  const updateCat = useUpdateCat();
  const { data: clients } = useClients();
  const pet = usePetLabels();
  const defaultPetType = pet.petType === "entrambi" ? undefined : pet.petType;
  const isEditing = !!cat;

  const form = useForm<CatFormValues>({
    resolver: zodResolver(catSchema),
    defaultValues: {
      name: cat?.name ?? "",
      client_id: cat?.client_id ?? defaultClientId ?? "",
      breed: cat?.breed ?? "",
      color: cat?.color ?? "",
      birth_date: cat?.birth_date ?? "",
      gender: cat?.gender ?? "",
      microchip: cat?.microchip ?? "",
      weight_kg: cat?.weight_kg ?? "",
      is_neutered: cat?.is_neutered ?? false,
      medical_notes: cat?.medical_notes ?? "",
      dietary_notes: cat?.dietary_notes ?? "",
      behavioral_notes: cat?.behavioral_notes ?? "",
      needs_double_cage: cat?.needs_double_cage ?? false,
      pet_type: cat?.pet_type ?? defaultPetType ?? "",
    },
  });

  const onSubmit = async (values: CatFormValues) => {
    if (pet.petType === "entrambi" && !values.pet_type) {
      toast.error("Seleziona il tipo di animale");
      return;
    }
    try {
      const payload = {
        name: values.name,
        client_id: values.client_id,
        is_neutered: values.is_neutered,
        needs_double_cage: values.needs_double_cage,
        tenant_id: profile?.tenant_id!,
        breed: values.breed || null,
        color: values.color || null,
        birth_date: values.birth_date || null,
        gender: values.gender || null,
        microchip: values.microchip || null,
        weight_kg: typeof values.weight_kg === "number" ? values.weight_kg : null,
        medical_notes: values.medical_notes || null,
        dietary_notes: values.dietary_notes || null,
        behavioral_notes: values.behavioral_notes || null,
        sibling_group_id: cat?.sibling_group_id ?? null,
        pet_type: (values.pet_type as PetType) || defaultPetType || null,
      };

      if (isEditing && cat) {
        await updateCat.mutateAsync({ id: cat.id, ...payload });
        toast.success(`${pet.singularCap} aggiornato`);
      } else {
        await createCat.mutateAsync(payload);
        toast.success(`${pet.singularCap} aggiunto`);
      }
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-3">
            {cat?.photo_url && (
              <img src={cat.photo_url} alt={cat.name} className="h-10 w-10 rounded-full object-cover border-2 border-primary/20" />
            )}
            {isEditing ? `Modifica ${pet.singularCap}` : `Nuovo ${pet.singularCap}`}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proprietario *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.last_name} {c.first_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pet.petType === "entrambi" && (
              <FormField
                control={form.control}
                name="pet_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo animale *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gatti">🐱 Gatto</SelectItem>
                        <SelectItem value="cani">🐶 Cane</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Luna" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razza</FormLabel>
                    <FormControl>
                      <Input placeholder="Europeo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colore</FormLabel>
                    <FormControl>
                      <Input placeholder="Tigrato" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sesso</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Maschio</SelectItem>
                        <SelectItem value="F">Femmina</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="4.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data nascita</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="microchip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Microchip</FormLabel>
                    <FormControl>
                      <Input placeholder="380123456789012" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_neutered"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label className="text-sm">Sterilizzato</Label>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="needs_double_cage"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label className="text-sm">Richiede casetta doppia</Label>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medical_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note mediche</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Allergie, farmaci..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dietary_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note dietetiche</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cibo specifico..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="behavioral_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note comportamentali</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Carattere, abitudini..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createCat.isPending || updateCat.isPending}>
                {createCat.isPending || updateCat.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
