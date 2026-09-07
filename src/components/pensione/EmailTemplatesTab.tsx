import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, FileText, CalendarClock, Zap, Send } from "lucide-react";
import { toast } from "sonner";
import { useTenantConfig, useUpdateTenantConfig } from "@/hooks/usePensioneConfig";
import { useSupabase } from "@/hooks/useSupabaseClient";

function renderTemplate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

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

// ── Automazioni email (Blocco 15) ─────────────────────────────────────────────
interface AutomationTemplateDef {
  key: string;
  subjectField: string;
  bodyField: string;
  title: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
  variables: string[];
  sampleVars: (tenantName: string, reviewUrl: string | null) => Record<string, string>;
}

// Stessi default e stesse variabili usate in supabase/functions/send-client-reminders/index.ts:
// se il titolare non personalizza un template, l'automazione usa questi.
const AUTOMATION_TEMPLATES: AutomationTemplateDef[] = [
  {
    key: "upcoming_stay",
    subjectField: "automation_upcoming_stay_subject",
    bodyField: "automation_upcoming_stay_body",
    title: "7 giorni prima",
    description: "Ricorda al cliente il soggiorno in arrivo.",
    defaultSubject: "{{numero_prenotazione}} - Ci vediamo tra una settimana!",
    defaultBody: "Ciao {{nome_cliente}},\n\nManca una settimana al soggiorno di {{pet_nomi}}, in arrivo il {{data_checkin}}.\n\nA presto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "pet_nomi", "data_checkin", "numero_prenotazione", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", pet_nomi: "Briciola", data_checkin: "15/03/2026",
      numero_prenotazione: "PH-00123", nome_pensione,
    }),
  },
  {
    key: "documents",
    subjectField: "automation_documents_subject",
    bodyField: "automation_documents_body",
    title: "3 giorni prima",
    description: "Segnala al cliente i documenti ancora mancanti.",
    defaultSubject: "{{numero_prenotazione}} - Documenti da caricare prima dell'arrivo",
    defaultBody: "Ciao {{nome_cliente}},\n\nIl check-in del {{data_checkin}} si avvicina: mancano ancora questi documenti: {{documenti_mancanti}}.\n\nPuoi caricarli (anche con una foto dal telefono) dalla tua area riservata ({{link_area_riservata}}), oppure portarli con te il giorno dell'arrivo.\n\nA presto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "data_checkin", "documenti_mancanti", "numero_prenotazione", "link_area_riservata", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", data_checkin: "15/03/2026", documenti_mancanti: "libretto vaccinazioni, modulo di affido",
      numero_prenotazione: "PH-00123", link_area_riservata: "https://app.pethotelmanager.it/cliente/preventivi", nome_pensione,
    }),
  },
  {
    key: "checkin",
    subjectField: "automation_checkin_subject",
    bodyField: "automation_checkin_body",
    title: "1 giorno prima del check-in",
    description: "Promemoria dell'arrivo del giorno successivo.",
    defaultSubject: "{{numero_prenotazione}} - Ci vediamo domani!",
    defaultBody: "Ciao {{nome_cliente}},\n\nTi aspettiamo domani, {{data_checkin}}, per il check-in di {{pet_nomi}} (orario: {{orario_checkin}}).\n\nA presto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "pet_nomi", "data_checkin", "orario_checkin", "numero_prenotazione", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", pet_nomi: "Briciola", data_checkin: "15/03/2026", orario_checkin: "15:00",
      numero_prenotazione: "PH-00123", nome_pensione,
    }),
  },
  {
    key: "checkout",
    subjectField: "automation_checkout_subject",
    bodyField: "automation_checkout_body",
    title: "1 giorno prima del check-out",
    description: "Promemoria della partenza del giorno successivo.",
    defaultSubject: "{{numero_prenotazione}} - Il check-out è domani",
    defaultBody: "Ciao {{nome_cliente}},\n\nTi ricordiamo che domani, {{data_checkout}}, è previsto il check-out di {{pet_nomi}} (orario: {{orario_checkout}}).\n\nA presto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "pet_nomi", "data_checkout", "orario_checkout", "numero_prenotazione", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", pet_nomi: "Briciola", data_checkout: "18/03/2026", orario_checkout: "11:00",
      numero_prenotazione: "PH-00123", nome_pensione,
    }),
  },
  {
    key: "checkout_summary",
    subjectField: "automation_checkout_summary_subject",
    bodyField: "automation_checkout_summary_body",
    title: "Al check-out",
    description: "Invia un riepilogo del soggiorno e il saldo residuo.",
    defaultSubject: "{{numero_prenotazione}} - Riepilogo del soggiorno",
    defaultBody: "Ciao {{nome_cliente}},\n\nIl soggiorno di {{pet_nomi}} si conclude oggi, {{data_checkout}}.\n\nDal {{data_checkin}} al {{data_checkout}} — totale € {{totale}}.\n\n{{riga_saldo}}\n\nGrazie per averci scelto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "pet_nomi", "data_checkin", "data_checkout", "totale", "riga_saldo", "numero_prenotazione", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", pet_nomi: "Briciola", data_checkin: "15/03/2026", data_checkout: "18/03/2026",
      totale: "180,00", riga_saldo: "Saldo residuo: € 50,00.", numero_prenotazione: "PH-00123", nome_pensione,
    }),
  },
  {
    key: "balance",
    subjectField: "automation_balance_subject",
    bodyField: "automation_balance_body",
    title: "Saldo scaduto",
    description: "Sollecita il cliente se resta un saldo da pagare dopo il check-out.",
    defaultSubject: "{{numero_prenotazione}} - Saldo da regolare",
    defaultBody: "Ciao {{nome_cliente}},\n\nRisulta ancora un saldo di € {{saldo}} da regolare per il soggiorno concluso il {{data_checkout}}.\n\nContattaci per sistemarlo appena possibile.\n\nGrazie,\n{{nome_pensione}}",
    variables: ["nome_cliente", "saldo", "data_checkout", "numero_prenotazione", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", saldo: "50,00", data_checkout: "18/03/2026", numero_prenotazione: "PH-00123", nome_pensione,
    }),
  },
  {
    key: "review_request",
    subjectField: "automation_review_request_subject",
    bodyField: "automation_review_request_body",
    title: "1 giorno dopo il check-out",
    description: "Richiede una recensione (serve il link, configurabile nel tab Automazioni).",
    defaultSubject: "Com'è andato il soggiorno da {{nome_pensione}}?",
    defaultBody: "Ciao {{nome_cliente}},\n\nGrazie per aver scelto {{nome_pensione}}! Se ti va, raccontaci com'è andata con una recensione:\n{{link_recensione}}\n\nGrazie,\n{{nome_pensione}}",
    variables: ["nome_cliente", "link_recensione", "nome_pensione"],
    sampleVars: (nome_pensione, reviewUrl) => ({
      nome_cliente: "Mario Rossi", link_recensione: reviewUrl || "https://esempio.com/recensione", nome_pensione,
    }),
  },
  {
    key: "winback",
    subjectField: "automation_winback_subject",
    bodyField: "automation_winback_body",
    title: "30 / 60 / 90 giorni dopo",
    description: "Ricorda al cliente di tornare a trovarci.",
    defaultSubject: "{{pet_nomi}} ci manca!",
    defaultBody: "Ciao {{nome_cliente}},\n\nSono passati {{giorni}} giorni dall'ultimo soggiorno di {{pet_nomi}}. Se stai organizzando una prossima trasferta, siamo qui!\n\nA presto,\n{{nome_pensione}}",
    variables: ["nome_cliente", "pet_nomi", "giorni", "nome_pensione"],
    sampleVars: (nome_pensione) => ({
      nome_cliente: "Mario Rossi", pet_nomi: "Briciola", giorni: "30", nome_pensione,
    }),
  },
];

function AutomationEmailForm({ def }: { def: AutomationTemplateDef }) {
  const supabase = useSupabase();
  const { data: config } = useTenantConfig();
  const updateConfig = useUpdateTenantConfig();

  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const currentSubject = subject ?? (config as any)?.[def.subjectField] ?? def.defaultSubject;
  const currentBody = body ?? (config as any)?.[def.bodyField] ?? def.defaultBody;

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        [def.subjectField]: currentSubject || null,
        [def.bodyField]: currentBody || null,
      } as any);
      toast.success("Template salvato");
      setSubject(null);
      setBody(null);
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  const handleSendTest = async () => {
    if (!config) return;
    if (!testEmail.trim()) {
      toast.error("Indica un indirizzo email per il test");
      return;
    }
    setSendingTest(true);
    try {
      const vars = def.sampleVars((config as any).name, (config as any).review_url ?? null);
      const renderedSubject = renderTemplate(currentSubject, vars);
      const renderedBody = renderTemplate(currentBody, vars);
      const { data, error } = await supabase.functions.invoke("send-automation-test-email", {
        body: {
          to: testEmail.trim(), subject: renderedSubject, bodyText: renderedBody,
          tenantId: config.id, tenantName: (config as any).name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Email di test inviata a ${testEmail.trim()}`);
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio del test");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{def.title}</CardTitle>
        <CardDescription>{def.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Oggetto</Label>
          <Input value={currentSubject} onChange={(e) => setSubject(e.target.value)} placeholder={def.defaultSubject} />
        </div>
        <div className="space-y-2">
          <Label>Testo</Label>
          <Textarea value={currentBody} onChange={(e) => setBody(e.target.value)} rows={7} placeholder={def.defaultBody} />
          <p className="text-xs text-muted-foreground">
            Variabili: {def.variables.map((v) => <code key={v} className="mr-1">{`{{${v}}}`}</code>)}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending} size="sm">
          <Save className="mr-2 h-4 w-4" /> Salva
        </Button>

        <div className="border-t pt-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Invia email di test (con dati di esempio, a un indirizzo a tua scelta)</Label>
          <div className="flex gap-2">
            <Input
              type="email" placeholder="tuo indirizzo@email.it" value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)} className="text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleSendTest} disabled={sendingTest} className="shrink-0 gap-1.5">
              <Send className="h-3.5 w-3.5" /> {sendingTest ? "Invio..." : "Invia test"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomazioniEmailTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Personalizza il testo di ciascuna automazione email (attivabili singolarmente nel tab "Automazioni"). Se non modifichi un template viene usato quello predefinito.
      </p>
      <Accordion type="single" collapsible className="w-full">
        {AUTOMATION_TEMPLATES.map((def) => (
          <AccordionItem key={def.key} value={def.key}>
            <AccordionTrigger className="text-sm">{def.title}</AccordionTrigger>
            <AccordionContent>
              <AutomationEmailForm def={def} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
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
          <TabsTrigger value="automazioni" className="gap-2">
            <Zap className="h-4 w-4" /> Automazioni
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preventivo" className="mt-4">
          <PreventivoEmailForm />
        </TabsContent>
        <TabsContent value="appuntamenti" className="mt-4">
          <AppuntamentiEmailForm />
        </TabsContent>
        <TabsContent value="automazioni" className="mt-4">
          <AutomazioniEmailTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
