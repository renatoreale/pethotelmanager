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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGlobalPaymentMethods, useUpsertGlobalPaymentMethod, useDeleteGlobalPaymentMethod,
} from "@/hooks/useGlobalConfig";

export function GlobalPaymentMethodsTab() {
  const { data: methods, isLoading } = useGlobalPaymentMethods();
  const upsert = useUpsertGlobalPaymentMethod();
  const remove = useDeleteGlobalPaymentMethod();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSortOrder((methods?.length || 0) + 1);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setName(m.name);
    setSortOrder(m.sort_order);
    setIsActive(m.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Inserisci un nome"); return; }
    await upsert.mutateAsync({
      id: editing?.id,
      name: name.trim(),
      sort_order: sortOrder,
      is_active: isActive,
    });
    toast.success(editing ? "Metodo aggiornato" : "Metodo creato");
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleting) {
      await remove.mutateAsync(deleting);
      toast.success("Metodo eliminato");
      setDeleting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Metodi di Pagamento (Template Globale)</CardTitle>
            <CardDescription>
              Questi metodi verranno copiati automaticamente in ogni nuova pensione creata
            </CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuovo Metodo</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !methods?.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessun metodo globale configurato</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ordine</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "outline"}>
                          {m.is_active ? "Attivo" : "Disattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Modifica Metodo Globale" : "Nuovo Metodo Globale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Contanti, Bonifico, Carta" /></div>
            <div className="space-y-2"><Label>Ordine</Label><Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
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
            <AlertDialogTitle>Eliminare il metodo globale?</AlertDialogTitle>
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
