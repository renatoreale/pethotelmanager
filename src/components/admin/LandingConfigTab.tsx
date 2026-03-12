import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function LandingConfigTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("landing_config").select("*").limit(1).single().then(({ data, error }) => {
      if (data) setConfig(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from("landing_config").update({
      trial_days: config.trial_days,
      base_plan_price_yearly: config.base_plan_price_yearly,
      pro_plan_price_yearly: config.pro_plan_price_yearly,
      hero_title: config.hero_title,
      hero_subtitle: config.hero_subtitle,
      hero_description: config.hero_description,
      cta_text: config.cta_text,
      show_trial_banner: config.show_trial_banner,
    }).eq("id", config.id);

    if (error) {
      toast.error("Errore nel salvataggio");
    } else {
      toast.success("Configurazione salvata");
    }
    setSaving(false);
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;
  if (!config) return <div className="py-12 text-center text-muted-foreground">Nessuna configurazione trovata</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurazione Landing Page</CardTitle>
          <CardDescription>Personalizza il contenuto della pagina pubblica e i parametri della prova gratuita</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Giorni di prova gratuita</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={config.trial_days}
                onChange={(e) => setConfig({ ...config, trial_days: parseInt(e.target.value) || 14 })}
              />
            </div>
            <div className="space-y-2 flex items-end gap-3">
              <div className="flex-1">
                <Label>Mostra banner trial</Label>
              </div>
              <Switch
                checked={config.show_trial_banner}
                onCheckedChange={(v) => setConfig({ ...config, show_trial_banner: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prezzo Base (€/anno)</Label>
              <Input
                type="number"
                min={0}
                value={config.base_plan_price_yearly}
                onChange={(e) => setConfig({ ...config, base_plan_price_yearly: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prezzo Pro (€/anno)</Label>
              <Input
                type="number"
                min={0}
                value={config.pro_plan_price_yearly}
                onChange={(e) => setConfig({ ...config, pro_plan_price_yearly: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titolo Hero</Label>
            <Input
              value={config.hero_title}
              onChange={(e) => setConfig({ ...config, hero_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Sottotitolo Hero</Label>
            <Input
              value={config.hero_subtitle}
              onChange={(e) => setConfig({ ...config, hero_subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrizione Hero</Label>
            <Textarea
              value={config.hero_description}
              onChange={(e) => setConfig({ ...config, hero_description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Testo CTA</Label>
            <Input
              value={config.cta_text}
              onChange={(e) => setConfig({ ...config, cta_text: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Salvataggio..." : "Salva Configurazione"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
