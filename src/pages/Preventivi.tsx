import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, CheckCircle2, FileText, Download, Inbox } from "lucide-react";
import { ConfirmPreventivoDialog } from "@/components/preventivi/ConfirmPreventivoDialog";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import {
  usePreventivi, useCreatePreventivo, useUpdatePreventivo,
  useDeletePreventivo, useConfirmPreventivo,
} from "@/hooks/usePreventivi";
import { PreventivoDialog } from "@/components/preventivi/PreventivoDialog";
import { usePaymentSplits } from "@/hooks/usePaymentSplits";
import { generatePreventivoPDF } from "@/lib/generatePreventivoPDF";

export default function Preventivi() {
  const { data: preventivi, isLoading } = usePreventivi();
  const createPreventivo = useCreatePreventivo();
  const updatePreventivo = useUpdatePreventivo();
  const deletePreventivo = useDeletePreventivo();
  const confirmPreventivo = useConfirmPreventivo();
  const { data: tenantConfig } = useTenantConfig();
  const { data: paymentSplits } = usePaymentSplits();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [confirming, setConfirming] = useState<any>(null);

  // Stay config
  const stayCalcType = (tenantConfig as any)?.stay_calc_type ?? "notti";
  const countCheckinDay = (tenantConfig as any)?.count_checkin_day ?? true;
  const countCheckoutDay = (tenantConfig as any)?.count_checkout_day ?? true;

  const calcStayDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const diff = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    if (diff < 0) return 0;
    if (stayCalcType === "notti") return diff;
    // giorni: base = all calendar days
    let days = diff + 1;
    if (!countCheckinDay) days -= 1;
    if (!countCheckoutDay) days -= 1;
    return Math.max(0, days);
  };

  const stayLabel = stayCalcType === "notti" ? "notti" : "giorni";

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

  const handleConfirm = async (depositData: {
    amount: number;
    payment_date: string;
    payment_method_id: string;
    notes?: string;
  }) => {
    if (!confirming) return;
    await confirmPreventivo.mutateAsync({
      id: confirming.id,
      deposit: depositData,
    });
    toast.success("Preventivo confermato → Prenotazione con caparra registrata");
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

  const handleDownloadPDF = async (p: any) => {
    if (!tenantConfig) return;
    try {
      await generatePreventivoPDF(p, tenantConfig as any, paymentSplits ?? [], stayCalcType);
      toast.success("PDF generato");
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione del PDF");
    }
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
                    <TableHead>Pets</TableHead>
                    <TableHead>Casetta</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>{stayCalcType === "notti" ? "Notti" : "Giorni"}</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Caparra</TableHead>
                    <TableHead className="w-[140px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const duration = calcStayDuration(p.check_in_date, p.check_out_date);
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
                            {p.cage_pool_type === "singola" ? "Singola" : "Doppia"} ×{p.units_occupied}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_in_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell className="text-sm">{format(parseISO(p.check_out_date), "dd MMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{duration}</TableCell>
                        <TableCell className="font-medium">€ {Number(p.total_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">€ {Number(p.deposit_amount ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Scarica PDF" onClick={() => handleDownloadPDF(p)}>
                              <Download className="h-4 w-4 text-blue-600" />
                            </Button>
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

      <PreventivoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onCreate={createPreventivo}
        onUpdate={updatePreventivo}
        stayCalcType={stayCalcType}
        countCheckinDay={countCheckinDay}
        countCheckoutDay={countCheckoutDay}
      />

      <ConfirmPreventivoDialog
        open={!!confirming}
        onOpenChange={(v) => { if (!v) setConfirming(null); }}
        preventivo={confirming}
        onConfirm={handleConfirm}
        isLoading={confirmPreventivo.isPending}
      />

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
