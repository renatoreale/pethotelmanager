import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, ImagePlus, Trash2, X, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { useDiarioForCat, useCreateDiarioEntry, useDeleteDiarioEntry } from "@/hooks/useDiario";
import { useUsers } from "@/hooks/useUsers";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { usePermissions } from "@/hooks/usePermissions";

interface DiarioTabProps {
  catId: string;
  bookingId: string | null;
}

export function DiarioTab({ catId, bookingId }: DiarioTabProps) {
  const { canWrite } = usePermissions();
  const canPost = canWrite("gatti");
  const supabase = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entries, isLoading } = useDiarioForCat(catId);
  const { users: staffUsers } = useUsers();
  const createEntry = useCreateDiarioEntry();
  const deleteEntry = useDeleteDiarioEntry();

  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    (staffUsers ?? []).forEach((u: any) => map.set(u.user_id, u.full_name || "Staff"));
    return map;
  }, [staffUsers]);

  const photoUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    return supabase.storage.from("diario-photos").getPublicUrl(photoPath).data.publicUrl;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'immagine non può superare i 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine valido");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!note.trim()) {
      toast.error("Scrivi un aggiornamento prima di pubblicare");
      return;
    }
    try {
      await createEntry.mutateAsync({
        catId, bookingId, note: note.trim(), photoFile,
      });
      toast.success("Aggiornamento pubblicato");
      setNote("");
      removePhoto();
    } catch (err: any) {
      toast.error(err.message || "Errore nella pubblicazione");
    }
  };

  const handleDelete = async (id: string, entryPhotoPath: string | null) => {
    try {
      await deleteEntry.mutateAsync({ id, catId, photoPath: entryPhotoPath });
      toast.success("Aggiornamento eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader><CardTitle className="text-base">Diario</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground -mt-2">
          Le foto restano disponibili fino a 15 giorni dopo il check-out del soggiorno: trascorso questo periodo,
          il diario di quel soggiorno viene svuotato automaticamente (testo e foto).
        </p>
        {canPost && (
          <div className="rounded-md border p-3 space-y-2.5">
            <Textarea
              rows={2}
              placeholder="Scrivi un aggiornamento... (es. Ha mangiato bene, giocato in giardino)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {photoPreview && (
              <div className="relative w-28">
                <img src={photoPreview} alt="Anteprima" className="w-28 h-28 object-cover rounded-md border" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-3.5 w-3.5" /> {photoFile ? "Cambia foto" : "Aggiungi foto"}
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={handlePublish} disabled={createEntry.isPending}>
                <Camera className="h-3.5 w-3.5" /> {createEntry.isPending ? "Pubblicazione..." : "Pubblica aggiornamento"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
        ) : !entries?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessun aggiornamento pubblicato.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const url = photoUrl(entry.photo_path);
              return (
                <div key={entry.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                  {url && (
                    <img src={url} alt="Aggiornamento" className="w-20 h-20 object-cover rounded-md border shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.note}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {entry.created_by ? (userNameById.get(entry.created_by) ?? "Staff") : "Staff"}
                      <span>·</span>
                      {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                      {entry.booking?.booking_number && (
                        <Badge variant="secondary" className="text-xs">{entry.booking.booking_number}</Badge>
                      )}
                    </div>
                  </div>
                  {canPost && (
                    <Button
                      type="button" size="icon" variant="ghost" className="shrink-0 h-8 w-8"
                      onClick={() => handleDelete(entry.id, entry.photo_path)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
