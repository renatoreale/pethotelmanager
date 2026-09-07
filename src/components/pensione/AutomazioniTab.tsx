import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useTenantConfig, useUpdateTenantConfig } from "@/hooks/usePensioneConfig";

interface AutomationDef {
  key:
    | "automation_upcoming_stay_reminder_enabled"
    | "automation_documents_reminder_enabled"
    | "automation_checkin_reminder_enabled"
    | "automation_checkout_reminder_enabled"
    | "automation_checkout_summary_enabled"
    | "automation_balance_reminder_enabled"
    | "automation_review_request_enabled"
    | "automation_winback_enabled";
  title: string;
  description: string;
}

const AUTOMATIONS: AutomationDef[] = [
  {
    key: "automation_upcoming_stay_reminder_enabled",
    title: "7 giorni prima",
    description: "Ricorda al cliente il soggiorno in arrivo.",
  },
  {
    key: "automation_documents_reminder_enabled",
    title: "3 giorni prima",
    description: "Segnala al cliente i documenti ancora mancanti.",
  },
  {
    key: "automation_checkin_reminder_enabled",
    title: "1 giorno prima del check-in",
    description: "Promemoria dell'arrivo del giorno successivo.",
  },
  {
    key: "automation_checkout_reminder_enabled",
    title: "1 giorno prima del check-out",
    description: "Promemoria della partenza del giorno successivo.",
  },
  {
    key: "automation_checkout_summary_enabled",
    title: "Al check-out",
    description: "Invia un riepilogo del soggiorno e il saldo residuo.",
  },
  {
    key: "automation_balance_reminder_enabled",
    title: "Saldo scaduto",
    description: "Sollecita il cliente se resta un saldo da pagare dopo il check-out.",
  },
  {
    key: "automation_review_request_enabled",
    title: "1 giorno dopo il check-out",
    description: "Richiede una recensione (serve il link qui sotto).",
  },
  {
    key: "automation_winback_enabled",
    title: "30 / 60 / 90 giorni dopo",
    description: "Ricorda al cliente di tornare a trovarci.",
  },
];

export function AutomazioniTab() {
  const { data: config, isLoading } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [savingReviewUrl, setSavingReviewUrl] = useState(false);

  if (isLoading || !config) {
    return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  }

  const currentReviewUrl = reviewUrl ?? (config as any).review_url ?? "";

  const handleToggle = (key: AutomationDef["key"], checked: boolean) => {
    updateConfig.mutate(
      { id: config.id, [key]: checked } as any,
      {
        onError: (err: any) => toast.error(err.message || "Errore nel salvataggio"),
      },
    );
  };

  const handleSaveReviewUrl = async () => {
    setSavingReviewUrl(true);
    try {
      await updateConfig.mutateAsync({ id: config.id, review_url: currentReviewUrl || null });
      toast.success("Link recensione salvato");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSavingReviewUrl(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Automazioni</h2>
        <p className="text-sm text-muted-foreground">
          Email automatiche predefinite verso i clienti. Ognuna è disattivata di default: attivala solo quando sei pronto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link recensione</CardTitle>
          <CardDescription>Usato dall'automazione "1 giorno dopo il check-out". Senza link quella email non viene inviata.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="https://g.page/r/....../review"
            value={currentReviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={handleSaveReviewUrl} disabled={savingReviewUrl}>
            <Save className="h-4 w-4 mr-1.5" /> Salva
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y pt-4">
          {AUTOMATIONS.map((a) => (
            <div key={a.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              <Switch
                checked={!!(config as any)[a.key]}
                onCheckedChange={(checked) => handleToggle(a.key, checked)}
                disabled={updateConfig.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
