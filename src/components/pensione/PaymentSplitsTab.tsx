import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTenantConfig, useUpdateTenantConfig } from "@/hooks/usePensioneConfig";
import { usePaymentSplits, useUpsertPaymentSplit, useDeletePaymentSplit } from "@/hooks/usePaymentSplits";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PAYMENT_MOMENTS = [
  { value: "caparra", label: "Caparra (alla conferma)" },
  { value: "check_in", label: "Al check-in" },
  { value: "check_out", label: "Al check-out" },
];

export function PaymentSplitsTab() {
  const { data: config } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();
  const { data: splits, isLoading } = usePaymentSplits();
  const upsertSplit = useUpsertPaymentSplit();
  const deleteSplit = useDeletePaymentSplit();

  // IBAN fields
  const [iban, setIban] = useState<string | null>(null);
  const [bankName, setBankName] = useState<string | null>(null);
  const [ibanHolder, setIbanHolder] = useState<string | null>(null);
  const [bolloAmount, setBolloAmount] = useState<number | null>(null);
  const [validityDays, setValidityDays] = useState<number | null>(null);

  const currentIban = iban ?? (config as any)?.iban ?? "";
  const currentBankName = bankName ?? (config as any)?.bank_name ?? "";
  const currentIbanHolder = ibanHolder ?? (config as any)?.iban_holder ?? "";
  const currentBolloAmount = bolloAmount ?? (config as any)?.bollo_amount ?? 0;
  const currentValidityDays = validityDays ?? (config as any)?.preventivo_validity_days ?? 5;
  

  // New split form
  const [editing, setEditing] = useState<any>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formPercentage, setFormPercentage] = useState(0);
  const [formMoment, setFormMoment] = useState("caparra");
  const [formNote, setFormNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);

  const totalPercentage = (splits ?? []).reduce((sum, s) => sum + Number(s.percentage), 0);

  const [formSortOrder, setFormSortOrder] = useState(0);

  const openNewSplit = () => {
    setEditing(null);
    setFormLabel("");
    setFormPercentage(0);
    setFormMoment("caparra");
    setFormNote("");
    setFormSortOrder((splits?.length ?? 0));
    setFormOpen(true);
  };

  const openEditSplit = (s: any) => {
    setEditing(s);
    setFormLabel(s.label);
    setFormPercentage(Number(s.percentage));
    setFormMoment(s.payment_moment);
    setFormNote(s.payment_method_note ?? "");
    setFormSortOrder(s.sort_order ?? 0);
    setFormOpen(true);
  };

  const handleSaveSplit = async () => {
    if (!config || !formLabel.trim()) return;
    try {
      await upsertSplit.mutateAsync({
        id: editing?.id,
        tenant_id: config.id,
        label: formLabel,
        percentage: formPercentage,
        payment_moment: formMoment,
        sort_order: formSortOrder,
        payment_method_note: formNote || null,
      });
      toast.success(editing ? "Rata aggiornata" : "Rata aggiunta");
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleDeleteSplit = async () => {
    if (!deleting) return;
    try {
      await deleteSplit.mutateAsync(deleting.id);
      toast.success("Rata eliminata");
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
    setDeleting(null);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        iban: currentIban || null,
        bank_name: currentBankName || null,
        iban_holder: currentIbanHolder || null,
        bollo_amount: currentBolloAmount,
        preventivo_validity_days: currentValidityDays,
      });
      toast.success("Configurazione preventivo salvata");
      setIban(null); setBankName(null); setIbanHolder(null); setBolloAmount(null); setValidityDays(null);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;

  return (
    <div className="space-y-6">
      {/* IBAN & Preventivo Config */}
      <Card>
        <CardHeader>
          <CardTitle>Configurazione Preventivo</CardTitle>
          <CardDescription>Dati bancari, imposta di bollo e validità preventivo per la generazione del PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={currentIban} onChange={(e) => setIban(e.target.value)} placeholder="IT..." />
            </div>
            <div className="space-y-2">
              <Label>Banca</Label>
              <Input value={currentBankName} onChange={(e) => setBankName(e.target.value)} placeholder="Nome banca" />
            </div>
            <div className="space-y-2">
              <Label>Intestatario IBAN</Label>
              <Input value={currentIbanHolder} onChange={(e) => setIbanHolder(e.target.value)} placeholder="Nome intestatario" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Imposta di bollo (€)</Label>
              <Input type="number" min={0} step={0.01} value={currentBolloAmount} onChange={(e) => setBolloAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Validità preventivo (giorni)</Label>
              <Input type="number" min={1} value={currentValidityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
            <Save className="mr-2 h-4 w-4" /> Salva Configurazione
          </Button>
        </CardContent>
      </Card>

      {/* Payment Splits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modalità di Pagamento Preventivo</CardTitle>
              <CardDescription>Configura le rate e le percentuali per il pagamento del soggiorno</CardDescription>
            </div>
            <Button onClick={openNewSplit} size="sm"><Plus className="mr-2 h-4 w-4" /> Aggiungi Rata</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalPercentage !== 100 && (splits?.length ?? 0) > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La somma delle percentuali è {totalPercentage}% — deve essere 100%
              </AlertDescription>
            </Alert>
          )}

          {!splits?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Nessuna rata configurata. Aggiungi le rate per il pagamento del preventivo.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ordine</TableHead>
                    <TableHead>Etichetta</TableHead>
                    <TableHead>Percentuale</TableHead>
                    <TableHead>Momento</TableHead>
                    <TableHead>Nota metodo pagamento</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {splits.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center text-muted-foreground">{s.sort_order}</TableCell>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell><Badge variant="secondary">{Number(s.percentage)}%</Badge></TableCell>
                      <TableCell>{PAYMENT_MOMENTS.find(m => m.value === s.payment_moment)?.label ?? s.payment_moment}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.payment_method_note ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditSplit(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(s)}>
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

          {/* Form dialog inline */}
          {formOpen && (
            <Card className="border-primary">
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Etichetta</Label>
                    <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="es. Caparra confirmatoria" />
                  </div>
                  <div className="space-y-2">
                    <Label>Percentuale (%)</Label>
                    <Input type="number" min={0} max={100} value={formPercentage} onChange={(e) => setFormPercentage(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ordine nel PDF</Label>
                    <Input type="number" min={0} value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} placeholder="0" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Momento del pagamento</Label>
                    <Select value={formMoment} onValueChange={setFormMoment}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MOMENTS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nota metodo pagamento</Label>
                    <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="es. tramite bonifico bancario" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSplit} disabled={upsertSplit.isPending || !formLabel.trim()}>
                    <Save className="mr-2 h-4 w-4" /> {editing ? "Aggiorna" : "Aggiungi"}
                  </Button>
                  <Button variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la rata?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `Stai per eliminare "${deleting.label}". Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSplit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
