import { useEffect, useState } from "react";
import { useClienteCats } from "@/hooks/useClienteAuth";
import { useDiarioForCat } from "@/hooks/useDiario";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Camera, PawPrint } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

  const photoUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    return supabase.storage.from("diario-photos").getPublicUrl(photoPath).data.publicUrl;
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
                          <img src={url} alt="Aggiornamento" className="w-20 h-20 object-cover rounded-md border shrink-0" />
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
    </div>
  );
}
