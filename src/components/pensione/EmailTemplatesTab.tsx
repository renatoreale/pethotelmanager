import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, FileText, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { useTenantConfig, useUpdateTenantConfig } from "@/hooks/usePensioneConfig";

// ── Preventivo email ──────────────────────────────────────────────────────────
function PreventivoEmailForm() {
  const { data: config } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();

  const DEFAULT_SUBJECT = `Richiesta dal {{data_checkin}} al {{data_checkout}}`;
  const DEFAULT_BODY = `Ciao {{nome_cliente}},\n\nti inviamo in allegato il preventivo n° {{numero_preventivo}} per il tuo soggiorno.\n\nPer qualsiasi domanda o per confermare la prenotazione, rispondi a questa email o contattaci direttamente.\n\nA presto,\n{{nome_pensione}}`;

  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);

  const currentSubject = subject ?? (config as any)?.preventivo_email_subject ?? DEFAULT_SUBJECT;
  const currentBody = body ?? (config as any)?.preventivo_email_body ?? DEFAULT_BODY;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        preventivo_email_subject: currentSubject || null,
        preventivo_email_body: currentBody || null,
      });
      toast.success("Template preventivo salvato");
      setSubject(null);
      setBody(null);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preventivo</CardTitle>
        <CardDescription>Testo della mail inviata al cliente quando viene spedito il preventivo PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Oggetto</Label>
          <Input
            value={currentSubject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={DEFAULT_SUBJECT}
          />
          <p className="text-xs text-muted-foreground">
            Variabili: <code>{"{{data_checkin}}"}</code>, <code>{"{{data_checkout}}"}</code>, <code>{"{{nome_cliente}}"}</code>, <code>{"{{numero_preventivo}}"}</code>, <code>{"{{nome_pensione}}"}</code>
          </p>
        </div>
        <div className="space-y-2">
          <Label>Testo</Label>
          <Textarea
            value={currentBody}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={DEFAULT_BODY}
          />
          <p className="text-xs text-muted-foreground">
            Variabili: <code>{"{{nome_cliente}}"}</code>, <code>{"{{numero_preventivo}}"}</code>, <code>{"{{nome_pensione}}"}</code>, <code>{"{{data_checkin}}"}</code>, <code>{"{{data_checkout}}"}</code>
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salva
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Appuntamenti email ────────────────────────────────────────────────────────
function AppuntamentiEmailForm() {
  const { data: config } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();

  const DEFAULT_SUBJECT = `Conferma appuntamenti - Prenotazione n° {{numero_prenotazione}}`;
  const DEFAULT_BODY = `Ciao {{nome_cliente}},\n\nti confermiamo i seguenti appuntamenti per la prenotazione n° {{numero_prenotazione}}:\n\nCheck-in: {{data_checkin}} alle {{orario_checkin}}\nCheck-out: {{data_checkout}} alle {{orario_checkout}}\n\nIn allegato trovi il modulo di affido da portare con te al check-in debitamente firmato.\n\nA presto,\n{{nome_pensione}}`;

  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);

  const currentSubject = subject ?? (config as any)?.appuntamento_email_subject ?? DEFAULT_SUBJECT;
  const currentBody = body ?? (config as any)?.appuntamento_email_body ?? DEFAULT_BODY;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        appuntamento_email_subject: currentSubject || null,
        appuntamento_email_body: currentBody || null,
      });
      toast.success("Template appuntamenti salvato");
      setSubject(null);
      setBody(null);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Appuntamenti</CardTitle>
        <CardDescription>Testo della mail inviata al cliente quando vengono fissati o aggiornati gli appuntamenti di check-in e check-out. Contiene il modulo di affido in allegato.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Oggetto</Label>
          <Input
            value={currentSubject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={DEFAULT_SUBJECT}
          />
          <p className="text-xs text-muted-foreground">
            Variabili: <code>{"{{numero_prenotazione}}"}</code>, <code>{"{{nome_cliente}}"}</code>, <code>{"{{nome_pensione}}"}</code>
          </p>
        </div>
        <div className="space-y-2">
          <Label>Testo</Label>
          <Textarea
            value={currentBody}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={DEFAULT_BODY}
          />
          <p className="text-xs text-muted-foreground">
            Variabili: <code>{"{{nome_cliente}}"}</code>, <code>{"{{numero_prenotazione}}"}</code>, <code>{"{{nome_pensione}}"}</code>, <code>{"{{data_checkin}}"}</code>, <code>{"{{data_checkout}}"}</code>, <code>{"{{orario_checkin}}"}</code>, <code>{"{{orario_checkout}}"}</code>
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salva
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EmailTemplatesTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Template Email</h2>
        <p className="text-sm text-muted-foreground">Personalizza i testi delle email inviate automaticamente ai clienti</p>
      </div>
      <Tabs defaultValue="preventivo">
        <TabsList>
          <TabsTrigger value="preventivo" className="gap-2">
            <FileText className="h-4 w-4" /> Preventivo
          </TabsTrigger>
          <TabsTrigger value="appuntamenti" className="gap-2">
            <CalendarClock className="h-4 w-4" /> Appuntamenti
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preventivo" className="mt-4">
          <PreventivoEmailForm />
        </TabsContent>
        <TabsContent value="appuntamenti" className="mt-4">
          <AppuntamentiEmailForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
