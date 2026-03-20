import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface PurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  priceId: string;
}

interface FormState {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  nome_pensione: string;
  citta_pensione: string;
  partita_iva: string;
  privacy: boolean;
  termini: boolean;
}

const EMPTY_FORM: FormState = {
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
  nome_pensione: "",
  citta_pensione: "",
  partita_iva: "",
  privacy: false,
  termini: false,
};

export function PurchaseRequestDialog({
  open,
  onOpenChange,
  planName,
  priceId,
}: PurchaseRequestDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const pianoLabel = planName.charAt(0).toUpperCase() + planName.slice(1);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.cognome.trim() || !form.email.trim()) {
      toast.error("Nome, cognome ed email sono obbligatori");
      return;
    }
    if (!form.nome_pensione.trim() || !form.citta_pensione.trim() || !form.partita_iva.trim()) {
      toast.error("Dati della pensione e P.IVA/Codice Fiscale sono obbligatori");
      return;
    }
    if (!form.privacy || !form.termini) {
      toast.error("Devi accettare la Privacy Policy e i Termini d'Uso");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-purchase", {
        body: {
          nome: form.nome.trim(),
          cognome: form.cognome.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim() || null,
          nome_pensione: form.nome_pensione.trim(),
          citta_pensione: form.citta_pensione.trim(),
          partita_iva: form.partita_iva.trim(),
          piano: planName,
          price_id: priceId,
        },
      });

      if (error) {
        // Estrai il messaggio reale dal body della risposta
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (!data?.url) throw new Error("URL di pagamento non ricevuto");

      onOpenChange(false);
      setForm(EMPTY_FORM);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'invio della richiesta");
      console.error("request-purchase error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Acquista Piano {pianoLabel}
          </DialogTitle>
          <DialogDescription>
            Compila i dati per procedere al pagamento sicuro tramite Stripe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-nome">Nome *</Label>
              <Input
                id="pr-nome"
                required
                maxLength={100}
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Mario"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-cognome">Cognome *</Label>
              <Input
                id="pr-cognome"
                required
                maxLength={100}
                value={form.cognome}
                onChange={(e) => set("cognome", e.target.value)}
                placeholder="Rossi"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-email">Email *</Label>
            <Input
              id="pr-email"
              type="email"
              required
              maxLength={255}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="mario@example.com"
              disabled={loading}
            />
          </div>

          {/* Telefono */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-telefono">Telefono *</Label>
            <Input
              id="pr-telefono"
              type="tel"
              required
              maxLength={20}
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              placeholder="+39 333 1234567"
              disabled={loading}
            />
          </div>

          {/* Nome Pensione */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-pensione">Nome della Pensione *</Label>
            <Input
              id="pr-pensione"
              required
              maxLength={150}
              value={form.nome_pensione}
              onChange={(e) => set("nome_pensione", e.target.value)}
              placeholder="La Pensione dei Mici"
              disabled={loading}
            />
          </div>

          {/* Città */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-citta">Città *</Label>
            <Input
              id="pr-citta"
              required
              maxLength={100}
              value={form.citta_pensione}
              onChange={(e) => set("citta_pensione", e.target.value)}
              placeholder="Milano"
              disabled={loading}
            />
          </div>

          {/* P.IVA / Codice Fiscale */}
          <div className="space-y-1.5">
            <Label htmlFor="pr-piva">P.IVA o Codice Fiscale *</Label>
            <Input
              id="pr-piva"
              required
              maxLength={20}
              value={form.partita_iva}
              onChange={(e) => set("partita_iva", e.target.value.toUpperCase())}
              placeholder="IT12345678901 oppure RSSMRA80A01H501X"
              disabled={loading}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="pr-privacy"
                checked={form.privacy}
                onCheckedChange={(v) => set("privacy", !!v)}
                disabled={loading}
                className="mt-0.5"
              />
              <Label htmlFor="pr-privacy" className="text-sm font-normal leading-snug cursor-pointer">
                Ho letto e accetto la{" "}
                <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                  Privacy Policy
                </Link>{" "}
                *
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="pr-termini"
                checked={form.termini}
                onCheckedChange={(v) => set("termini", !!v)}
                disabled={loading}
                className="mt-0.5"
              />
              <Label htmlFor="pr-termini" className="text-sm font-normal leading-snug cursor-pointer">
                Ho letto e accetto i{" "}
                <Link to="/termini" target="_blank" className="text-primary underline underline-offset-2">
                  Termini d'Uso
                </Link>{" "}
                *
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Elaborazione...</>
            ) : (
              <><CreditCard className="h-4 w-4" /> Procedi al Pagamento</>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Pagamento sicuro gestito da Stripe. I tuoi dati non vengono memorizzati da noi.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
