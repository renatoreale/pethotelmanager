import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExtractQuoteRequest } from "@/hooks/useExtractQuoteRequest";
import { useClients, type Client } from "@/hooks/useClients";

interface ExtractQuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (prefill: { client_id: string; check_in_date: string; check_out_date: string; notes?: string }) => void;
}

// Blocco 27: incolla una richiesta di soggiorno arrivata per telefono,
// WhatsApp o email; l'AI estrae date e note, ma l'abbinamento al cliente
// resta SEMPRE una scelta manuale dello staff (nessun match automatico,
// nessuna creazione di client) — solo alla conferma si passa i dati risolti
// al normale flusso "Nuovo preventivo" già esistente in Preventivi.tsx.
export function ExtractQuoteRequestDialog({ open, onOpenChange, onConfirm }: ExtractQuoteRequestDialogProps) {
  const [text, setText] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [notes, setNotes] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [extracted, setExtracted] = useState(false);

  const extractRequest = useExtractQuoteRequest();
  const { data: clients } = useClients(clientSearch);

  const reset = () => {
    setText("");
    setCheckInDate("");
    setCheckOutDate("");
    setNotes("");
    setClientSearch("");
    setSelectedClient(null);
    setExtracted(false);
  };

  const handleExtract = async () => {
    if (!text.trim()) return;
    try {
      const result = await extractRequest.mutateAsync(text);
      setCheckInDate(result.check_in_date || "");
      setCheckOutDate(result.check_out_date || "");
      const petInfo = [
        result.num_pets ? `${result.num_pets} pet` : null,
        result.pet_names || null,
      ].filter(Boolean).join(" · ");
      setNotes([petInfo, result.notes].filter(Boolean).join(" — "));
      setClientSearch(result.client_name || result.client_phone || result.client_email || "");
      setExtracted(true);
    } catch {
      // Il messaggio d'errore è già mostrato da React Query allo stato isError; nessuna azione extra qui.
    }
  };

  const handleConfirm = () => {
    if (!selectedClient || !checkInDate || !checkOutDate) return;
    onConfirm({
      client_id: selectedClient.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      notes: notes || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Estrai richiesta da testo libero
          </DialogTitle>
          <DialogDescription>
            Incolla il messaggio del cliente (WhatsApp, email o appunti di una telefonata): l'AI propone date e note, tu confermi sempre il cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Testo della richiesta</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Es: Ciao, sono Maria Rossi, vorrei portare i miei due gatti Mia e Leo dal 10 al 15 dicembre, uno dei due ha bisogno di una terapia..."
              maxLength={4000}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExtract}
              disabled={!text.trim() || extractRequest.isPending}
              className="gap-2"
            >
              {extractRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Estrai dati
            </Button>
            {extractRequest.isError && (
              <p className="text-xs text-destructive">{(extractRequest.error as Error)?.message}</p>
            )}
          </div>

          {extracted && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Check-in</Label>
                    <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Check-out</Label>
                    <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate || undefined} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Note</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente * (conferma manuale)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); }}
                      placeholder="Cerca cliente per nome, email o telefono..."
                      className="pl-9"
                    />
                  </div>
                  {!selectedClient && clientSearch.trim().length > 0 && (
                    <div className="rounded-md border max-h-40 overflow-y-auto divide-y">
                      {(clients ?? []).length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">Nessun cliente trovato con questi dati.</p>
                      ) : (
                        (clients ?? []).slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex flex-col gap-0.5 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                            onClick={() => { setSelectedClient(c); setClientSearch(`${c.first_name} ${c.last_name}`); }}
                          >
                            <span className="font-medium">{c.first_name} {c.last_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {selectedClient && (
                    <p className={cn("text-xs flex items-center gap-1.5 text-muted-foreground")}>
                      <User className="h-3.5 w-3.5" /> Cliente selezionato: {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annulla</Button>
          <Button
            onClick={handleConfirm}
            disabled={!extracted || !selectedClient || !checkInDate || !checkOutDate}
          >
            Apri preventivo con questi dati
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
