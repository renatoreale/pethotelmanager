import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PurchaseRequest {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  nome_pensione: string;
  citta_pensione: string;
  partita_iva: string;
  piano: string;
  status: string;
  stripe_session_id: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pagato") {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Pagato</Badge>;
  }
  if (status === "pending") {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In attesa</Badge>;
  }
  if (status === "cancellato") {
    return <Badge variant="destructive">Cancellato</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function PianoLabel({ piano }: { piano: string }) {
  const map: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    business: "Business",
  };
  return <span>{map[piano] ?? piano}</span>;
}

export function PurchaseRequestsTab() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<PurchaseRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento: " + error.message);
    } else {
      setRequests(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    const { error } = await (supabase as any)
      .from("purchase_requests")
      .delete()
      .eq("id", deleting.id);
    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
    } else {
      toast.success("Richiesta eliminata");
      setRequests((prev) => prev.filter((r) => r.id !== deleting.id));
    }
    setDeleteLoading(false);
    setDeleting(null);
  };

  const pending = requests.filter((r) => r.status === "pending").length;
  const paid = requests.filter((r) => r.status === "pagato").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Richieste di Acquisto</CardTitle>
          <CardDescription className="mt-1">
            {requests.length} totali · {paid} pagate · {pending} in attesa
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nessuna richiesta di acquisto ancora.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Pensione</TableHead>
                  <TableHead>Città</TableHead>
                  <TableHead>P.IVA / CF</TableHead>
                  <TableHead>Piano</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.nome} {r.cognome}
                    </TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm">{r.telefono || "—"}</TableCell>
                    <TableCell className="text-sm">{r.nome_pensione}</TableCell>
                    <TableCell className="text-sm">{r.citta_pensione}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">{r.partita_iva}</TableCell>
                    <TableCell>
                      <PianoLabel piano={r.piano} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la richiesta di{" "}
              <strong>{deleting?.nome} {deleting?.cognome}</strong> (Piano {deleting?.piano} — {deleting?.status === "pagato" ? "Pagato" : "In attesa"}).
              <br />Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
