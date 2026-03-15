import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, TestTube, Cloud, Server, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useDbConfig, useUpdateDbConfig, useTestExternalConnection, type DbConfig } from "@/hooks/useDbConfig";

export function DatabaseConfigTab() {
  const { data: config, isLoading } = useDbConfig();
  const updateConfig = useUpdateDbConfig();
  const testConnection = useTestExternalConnection();

  const [mode, setMode] = useState<"cloud" | "external">("cloud");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalAnonKey, setExternalAnonKey] = useState("");
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (config) {
      setMode(config.mode);
      setExternalUrl(config.external_url);
      setExternalAnonKey(config.external_anon_key);
    }
  }, [config]);

  const handleSave = () => {
    const newConfig: DbConfig = {
      mode,
      external_url: externalUrl.trim(),
      external_anon_key: externalAnonKey.trim(),
    };
    updateConfig.mutate(newConfig);
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await testConnection.mutateAsync({ url: externalUrl.trim(), anonKey: externalAnonKey.trim() });
      setTestResult("success");
    } catch {
      setTestResult("error");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Caricamento configurazione...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Configurazione Database
        </CardTitle>
        <CardDescription>
          Scegli se utilizzare il database integrato in Lovable Cloud o un progetto Supabase esterno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Stato attuale:</span>
          {config?.mode === "cloud" ? (
            <Badge variant="default" className="gap-1">
              <Cloud className="h-3 w-3" /> Lovable Cloud
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Server className="h-3 w-3" /> Supabase Esterno
            </Badge>
          )}
        </div>

        {/* Mode selection */}
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "cloud" | "external")} className="space-y-3">
          <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="cloud" id="cloud" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="cloud" className="flex items-center gap-2 cursor-pointer font-medium">
                <Cloud className="h-4 w-4 text-primary" />
                Lovable Cloud
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Usa il database integrato. Nessuna configurazione aggiuntiva necessaria.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="external" id="external" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="external" className="flex items-center gap-2 cursor-pointer font-medium">
                <Server className="h-4 w-4 text-orange-500" />
                Supabase Esterno
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Connettiti a un progetto Supabase esistente con URL e chiave anonima.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* External config fields */}
        {mode === "external" && (
          <div className="space-y-4 rounded-lg border border-dashed p-4 bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="ext-url">Supabase URL</Label>
              <Input
                id="ext-url"
                placeholder="https://xxxx.supabase.co"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ext-key">Anon Key (chiave pubblica)</Label>
              <Input
                id="ext-key"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={externalAnonKey}
                onChange={(e) => setExternalAnonKey(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={!externalUrl || !externalAnonKey || testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Testa Connessione
              </Button>
              {testResult === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Connessione riuscita
                </span>
              )}
              {testResult === "error" && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <XCircle className="h-4 w-4" /> Connessione fallita
                </span>
              )}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Salva Configurazione
          </Button>
        </div>

        {/* Warning */}
        {mode === "external" && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4 text-sm text-orange-800 dark:text-orange-200">
            <strong>Attenzione:</strong> Il progetto Supabase esterno deve avere lo stesso schema del database (tabelle, funzioni, RLS policy). 
            Usa gli script <code>schema-export.sql</code> e <code>data-export.sql</code> per replicare la struttura.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
