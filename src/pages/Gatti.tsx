import { useState } from "react";
import { useCats, useDeleteCat } from "@/hooks/useCats";
import { CatDialog } from "@/components/cats/CatDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Cat as CatIcon, Dog, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePetLabels } from "@/hooks/usePetLabels";

export default function Gatti() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [deletingCat, setDeletingCat] = useState<any | null>(null);

  const { data: cats, isLoading } = useCats(undefined, search);
  const deleteCat = useDeleteCat();
  const pet = usePetLabels();
  const PetIcon = pet.iconName === "Cat" ? CatIcon : pet.iconName === "Dog" ? Dog : PawPrint;

  const handleEdit = (cat: any) => {
    setEditingCat(cat);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCat(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    try {
      await deleteCat.mutateAsync(deletingCat.id);
      toast.success(`${pet.singularCap} eliminato`);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
    setDeletingCat(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pet.pluralCap}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pet.registrySubtitle} · {cats?.length ?? 0} registrati
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> Nuovo {pet.singularCap}
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, razza, microchip..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !cats?.length ? (
            <div className="py-12 text-center text-muted-foreground">
              {search ? "Nessun risultato" : `Nessun ${pet.singular} registrato`}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                   <TableRow>
                     {pet.petType === "entrambi" && <TableHead>Tipo</TableHead>}
                     <TableHead>Nome</TableHead>
                     <TableHead>Proprietario</TableHead>
                     <TableHead>Microchip</TableHead>
                     <TableHead>Razza</TableHead>
                     <TableHead>Sesso</TableHead>
                     <TableHead>Peso</TableHead>
                     <TableHead>Casetta</TableHead>
                     <TableHead className="w-[100px]">Azioni</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {cats.map((cat: any) => (
                     <TableRow key={cat.id}>
                       {pet.petType === "entrambi" && (
                         <TableCell>
                           {cat.pet_type === "cani" ? (
                             <Badge variant="outline" className="text-xs gap-1"><Dog className="h-3 w-3" />Cane</Badge>
                           ) : cat.pet_type === "gatti" ? (
                             <Badge variant="outline" className="text-xs gap-1"><CatIcon className="h-3 w-3" />Gatto</Badge>
                           ) : (
                             <span className="text-muted-foreground text-xs">—</span>
                           )}
                         </TableCell>
                       )}
                       <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {cat.photo_url ? (
                              <img src={cat.photo_url} alt={cat.name} className="h-8 w-8 rounded-full object-cover border border-border shrink-0" />
                            ) : pet.petType === "entrambi"
                              ? cat.pet_type === "cani" ? <Dog className="h-4 w-4 text-primary shrink-0" /> : <CatIcon className="h-4 w-4 text-primary shrink-0" />
                              : <PetIcon className="h-4 w-4 text-primary shrink-0" />
                            }
                            {cat.name}
                          </div>
                        </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.clients ? `${cat.clients.last_name} ${cat.clients.first_name}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {cat.microchip ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cat.breed ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.gender === "M" ? "Maschio" : cat.gender === "F" ? "Femmina" : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.weight_kg ? `${cat.weight_kg} kg` : "—"}
                      </TableCell>
                      <TableCell>
                        {cat.needs_double_cage ? (
                          <Badge variant="outline" className="text-xs border-warning text-warning">Doppia</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Singola</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingCat(cat)}>
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

      <CatDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCat(null);
        }}
        cat={editingCat}
      />

      <AlertDialog open={!!deletingCat} onOpenChange={() => setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {pet.articleSingular}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCat && `Stai per eliminare ${deletingCat.name}. Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
