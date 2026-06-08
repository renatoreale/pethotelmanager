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
import { CreditCard, Loader2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

interface TrialUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: {
    nome?: string;
    cognome?: string;
    email?: string;
    telefono?: string;
    nome_pensione?: string;
    citta_pensione?: string;
    partita_iva?: string;
  };
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

type PlanKey = keyof typeof STRIPE_TIERS;

const PLANS: { key: PlanKey; label: string; monthly: number; yearly: number; features: string[] }[] = [
  {
    key: "starter",
    label: "Singola Pensione",
    monthly: STRIPE_TIERS.starter.priceMonthly,
    yearly: STRIPE_TIERS.starter.priceYearly,
    features: [
      "Creazione preventivi",
      "Gestione prenotazioni",
      "Documenti PDF",
      "Calendario appuntamenti",
      "Anagrafica clienti",
      "Registro presenze",
      "Occupazione casette",
      "Report e statistiche",
      "Area riservata per cliente",
    ],
  },
  {
    key: "multi",
    label: "Multi Pensione",
    monthly: STRIPE_TIERS.multi.priceMonthly,
    yearly: STRIPE_TIERS.multi.priceYearly,
    features: [
      "Tutto di Singola Pensione",
      "Fino a 3 pensioni incluse",
      "€20 per pensione al mese",
      "Dashboard multi-sede",
    ],
  },
];

export function TrialUpgradeDialog({ open, onOpenChange, prefill }: TrialUpgradeDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("starter");
  const [form, setForm] = useState<FormState>({
    nome: prefill?.nome ?? "",
    cognome: prefill?.cognome ?? "",
    email: prefill?.email ?? "",
    telefono: prefill?.telefono ?? "",
    nome_pensione: prefill?.nome_pensione ?? "",
    citta_pensione: prefill?.citta_pensione ?? "",
    partita_iva: prefill?.partita_iva ?? "",
    privacy: false,
    termini: false,
  });
  const [loading, setLoading] = useState(false);

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

    const tier = STRIPE_TIERS[selectedPlan];

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
          piano: tier.name,
          price_id: tier.price_id,
        },
      });

      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (!data?.url) throw new Error("URL di pagamento non ricevuto");

      onOpenChange(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Attiva il tuo abbonamento</DialogTitle>
          <DialogDescription>
            Scegli il piano e compila i dati per procedere al pagamento sicuro tramite Stripe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Selettore piano */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Seleziona il piano *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.key;
                return (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => setSelectedPlan(plan.key)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{plan.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-lg font-bold">
                      €{plan.monthly}
                      <span className="text-xs font-normal text-muted-foreground">/mese</span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">€{plan.yearly}/anno</p>
                    <ul className="space-y-0.5">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tu-nome">Nome *</Label>
              <Input
                id="tu-nome"
                required
                maxLength={100}
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Mario"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tu-cognome">Cognome *</Label>
              <Input
                id="tu-cognome"
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
            <Label htmlFor="tu-email">Email *</Label>
            <Input
              id="tu-email"
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
            <Label htmlFor="tu-telefono">Telefono *</Label>
            <Input
              id="tu-telefono"
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
            <Label htmlFor="tu-pensione">Nome della Pensione *</Label>
            <Input
              id="tu-pensione"
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
            <Label htmlFor="tu-citta">Città *</Label>
            <Input
              id="tu-citta"
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
            <Label htmlFor="tu-piva">P.IVA o Codice Fiscale *</Label>
            <Input
              id="tu-piva"
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
                id="tu-privacy"
                checked={form.privacy}
                onCheckedChange={(v) => set("privacy", !!v)}
                disabled={loading}
                className="mt-0.5"
              />
              <Label htmlFor="tu-privacy" className="text-sm font-normal leading-snug cursor-pointer">
                Ho letto e accetto la{" "}
                <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                  Privacy Policy
                </Link>{" "}
                *
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="tu-termini"
                checked={form.termini}
                onCheckedChange={(v) => set("termini", !!v)}
                disabled={loading}
                className="mt-0.5"
              />
              <Label htmlFor="tu-termini" className="text-sm font-normal leading-snug cursor-pointer">
                Ho letto e accetto i{" "}
                <Link to="/termini" target="_blank" className="text-primary underline underline-offset-2">
                  Termini d'Uso
                </Link>{" "}
                *
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Elaborazione...</>
            ) : (
              <><CreditCard className="h-4 w-4" /> Procedi al Pagamento — Piano {STRIPE_TIERS[selectedPlan].name}</>
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
