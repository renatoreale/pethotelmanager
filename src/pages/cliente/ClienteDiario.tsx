import { useEffect, useState } from "react";
import { useClienteCats } from "@/hooks/useClienteAuth";
import { useDiarioForCat } from "@/hooks/useDiario";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Camera, PawPrint, Download, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

export default function ClienteDiario() {
  const supabase = useSupabase();
  const { data: cats } = useClienteCats();
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  useEffect(() => {
    if (!selectedCatId && cats && cats.length > 0) {
      setSelectedCatId(cats[0].id);
    }
  }, [cats, selectedCatId]);

  const { data: entries, isLoading } = useDiarioForCat(selectedCatId || undefined);
  const [lightboxEntry, setLightboxEntry] = useState<{ url: string; catName: string; createdAt: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const photoUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    return supabase.storage.from("diario-photos").getPublicUrl(photoPath).data.publicUrl;
  };

  // Nome file: "NomePet-2026-09-07.ext" — ripulito da caratteri non adatti a
  // un nome di file (spazi/accenti/simboli collassati in "-").
  const downloadFileName = (catName: string, createdAt: string, ext: string) => {
    const safeName = catName
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pet";
    return `${safeName}-${format(new Date(createdAt), "yyyy-MM-dd")}.${ext}`;
  };

  // Il download diretto via <a download> non è affidabile su URL cross-origin
  // (il browser spesso apre l'immagine invece di scaricarla): si scarica il
  // file e si forza il salvataggio da un blob URL, che è sempre same-origin.
  const handleDownload = async (entry: { url: string; catName: string; createdAt: string }) => {
    setDownloading(true);
    try {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error("Download non riuscito");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = blob.type.split("/")[1] || "jpg";
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = downloadFileName(entry.catName, entry.createdAt, ext);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Errore nel download della foto");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6" /> Diario
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gli aggiornamenti pubblicati dallo staff sul soggiorno del tuo pet.
        </p>
      </div>

      {!cats?.length ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nessun pet registrato.</CardContent></Card>
      ) : (
        <>
          {cats.length > 1 && (
            <Select value={selectedCatId} onValueChange={setSelectedCatId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cats.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {cats.length === 1 ? `Diario di ${cats[0].name}` : "Aggiornamenti"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
              ) : !entries?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nessun aggiornamento pubblicato per ora.
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => {
                    const url = photoUrl(entry.photo_path);
                    return (
                      <div key={entry.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                        {url && (
                          <button
                            type="button"
                            onClick={() => setLightboxEntry({
                              url, createdAt: entry.created_at,
                              catName: cats.find((c: any) => c.id === selectedCatId)?.name ?? "",
                            })}
                            className="relative shrink-0 group"
                            title="Ingrandisci foto"
                          >
                            <img src={url} alt="Aggiornamento" className="w-20 h-20 object-cover rounded-md border" />
                            <span className="absolute inset-0 rounded-md bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.note}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-xs text-muted-foreground">
                            <PawPrint className="h-3 w-3" />
                            {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                            {entry.booking?.booking_number && (
                              <Badge variant="secondary" className="text-xs">{entry.booking.booking_number}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!lightboxEntry} onOpenChange={(open) => !open && setLightboxEntry(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="px-2 pt-2">
            <DialogTitle className="text-sm font-normal text-muted-foreground">Foto del diario</DialogTitle>
          </DialogHeader>
          {lightboxEntry && (
            <div className="space-y-2">
              <img src={lightboxEntry.url} alt="Aggiornamento" className="w-full max-h-[75vh] object-contain rounded-md" />
              <Button
                type="button" className="gap-1.5 w-full sm:w-auto"
                onClick={() => handleDownload(lightboxEntry)} disabled={downloading}
              >
                <Download className="h-4 w-4" /> {downloading ? "Download..." : "Scarica foto"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
