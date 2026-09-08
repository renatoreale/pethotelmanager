import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "@/components/InfoTooltip";
import { SlideshowRecorder } from "@/components/marketing/SlideshowRecorder";
import {
  usePromoPhotoCandidates, useGenerateMarketingPromo, type MarketingPromotion,
} from "@/hooks/useMarketingPromo";
import { Sparkles, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiato negli appunti`);
}

function PhotoPicker({
  tenantId, selected, onToggle,
}: {
  tenantId: string;
  selected: Set<string>;
  onToggle: (url: string) => void;
}) {
  const { data: candidates, isLoading } = usePromoPhotoCandidates(tenantId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Caricamento foto...</p>;
  if (!candidates?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna foto disponibile: carica prima qualche foto nella scheda di un pet o nel diario.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
      {candidates.map((c) => {
        const isSelected = selected.has(c.url);
        return (
          <button
            key={c.url}
            type="button"
            onClick={() => onToggle(c.url)}
            className={`relative rounded-md overflow-hidden border-2 aspect-square ${isSelected ? "border-primary" : "border-transparent"}`}
          >
            <img src={c.url} alt={c.label} className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1">
              <Checkbox checked={isSelected} className="bg-white/90" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
              {c.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PromotionResults({ promotion }: { promotion: MarketingPromotion }) {
  return (
    <Tabs defaultValue="social">
      <TabsList>
        <TabsTrigger value="social">Social</TabsTrigger>
        <TabsTrigger value="google">Google Ads</TabsTrigger>
        <TabsTrigger value="video">Video TikTok</TabsTrigger>
      </TabsList>

      <TabsContent value="social" className="mt-4 space-y-3">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="text-xs text-muted-foreground">Testo del post</Label>
            <p className="text-sm whitespace-pre-wrap">{promotion.social_caption}</p>
            <p className="text-sm text-primary">{promotion.social_hashtags}</p>
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => copyToClipboard(`${promotion.social_caption}\n\n${promotion.social_hashtags}`, "Testo social")}
            >
              <Copy className="h-3.5 w-3.5" /> Copia testo
            </Button>
          </CardContent>
        </Card>
        {promotion.photo_urls[0] && (
          <img src={promotion.photo_urls[0]} alt="Anteprima" className="rounded-lg max-h-64 mx-auto object-cover" />
        )}
      </TabsContent>

      <TabsContent value="google" className="mt-4 space-y-3">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="text-xs text-muted-foreground">Headline (max 30 caratteri)</Label>
            <p className="text-sm font-semibold">{promotion.google_ad_headline}</p>
            <Label className="text-xs text-muted-foreground">Descrizione (max 90 caratteri)</Label>
            <p className="text-sm">{promotion.google_ad_description}</p>
            <Button
              size="sm" variant="outline" className="gap-1.5"
              onClick={() => copyToClipboard(`${promotion.google_ad_headline}\n${promotion.google_ad_description}`, "Testo Google Ads")}
            >
              <Copy className="h-3.5 w-3.5" /> Copia testo
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="video" className="mt-4">
        <SlideshowRecorder slides={promotion.video_slides} />
      </TabsContent>
    </Tabs>
  );
}

export function MarketingPromoDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [contextNote, setContextNote] = useState("");
  const [promotion, setPromotion] = useState<MarketingPromotion | null>(null);
  const generate = useGenerateMarketingPromo();

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else if (next.size < 8) next.add(url);
      else toast.error("Puoi selezionare al massimo 8 foto");
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) {
      toast.error("Seleziona almeno una foto");
      return;
    }
    try {
      const result = await generate.mutateAsync({
        tenant_id: tenantId,
        photo_urls: Array.from(selected),
        context_note: contextNote,
      });
      setPromotion(result);
    } catch (err: any) {
      toast.error(err.message || "Errore nella generazione della promozione");
    }
  };

  const reset = () => {
    setPromotion(null);
    setSelected(new Set());
    setContextNote("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Crea promozione con AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            Crea promozione con AI
            <InfoTooltip text="Un direttore marketing senior e un copywriter senior (AI) scrivono per te un post social, un annuncio Google Ads e uno storyboard per un video TikTok, usando le foto reali che scegli qui sotto." />
          </DialogTitle>
          <DialogDescription>
            Scegli fino a 8 foto reali della pensione: verranno usate per scrivere i testi e per lo slideshow TikTok.
          </DialogDescription>
        </DialogHeader>

        {!promotion ? (
          <div className="space-y-4">
            <PhotoPicker tenantId={tenantId} selected={selected} onToggle={toggle} />
            <div className="space-y-1.5">
              <Label className="text-xs">Contesto aggiuntivo (facoltativo)</Label>
              <Textarea
                placeholder="Es. sconto 15% per soggiorni dal 10 al 20 settembre, posti liberi last-minute..."
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full gap-1.5">
              <Sparkles className="h-4 w-4" />
              {generate.isPending ? "Il team di marketing sta scrivendo..." : "Genera con AI"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <PromotionResults promotion={promotion} />
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Crea un'altra promozione
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
