import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClienteProfile, useClienteCats, useCreateQuoteRequest, useClienteTenant } from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Send, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabaseClient";

export default function ClienteRichiestaPreventivo() {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { data: profile } = useClienteProfile();
  const { data: cats } = useClienteCats();
  const { data: tenant } = useClienteTenant();
  const createRequest = useCreateQuoteRequest();

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [form, setForm] = useState({
    check_in_date: today,
    check_out_date: tomorrow,
    notes: "",
  });
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Availability check via RPC
  const { data: availability } = useQuery({
    queryKey: ["cliente-availability", profile?.tenant_id, form.check_in_date, form.check_out_date],
    queryFn: async () => {
      if (!profile?.tenant_id || form.check_out_date <= form.check_in_date) return null;
      const { data, error } = await supabase.rpc("check_availability", {
        _tenant_id: profile.tenant_id,
        _check_in: form.check_in_date,
        _check_out: form.check_out_date,
      });
      if (error) throw error;
      return data as { cage_pool_type: string; max_occupied: number; total_capacity: number }[];
    },
    enabled: !!profile?.tenant_id && form.check_out_date > form.check_in_date,
  });

  const availabilityStatus = useMemo(() => {
    if (!availability) return null;
    const singola = availability.find((a) => a.cage_pool_type === "singola");
    const doppia = availability.find((a) => a.cage_pool_type === "doppia");
    const freeSingole = (singola?.total_capacity ?? 0) - (singola?.max_occupied ?? 0);
    const freeDoppie = (doppia?.total_capacity ?? 0) - (doppia?.max_occupied ?? 0);
    const totalFree = freeSingole + freeDoppie;
    return { freeSingole, freeDoppie, totalFree };
  }, [availability]);

  const noAvailability = availabilityStatus !== null && availabilityStatus.totalFree <= 0;

  const toggleCat = (catId: string) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || selectedCats.length === 0) {
      toast.error("Seleziona almeno un animale");
      return;
    }
    if (form.check_out_date <= form.check_in_date) {
      toast.error("La data di check-out deve essere successiva al check-in");
      return;
    }

    const petNames = cats
      ?.filter((c: any) => selectedCats.includes(c.id))
      .map((c: any) => c.name)
      .join(", ") || "";

    try {
      await createRequest.mutateAsync({
        tenant_id: profile.tenant_id,
        client_id: profile.id,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        num_pets: selectedCats.length,
        pet_names: petNames,
        notes: form.notes,
      });
      toast.success("Richiesta inviata con successo!");
      navigate("/cliente");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'invio della richiesta");
    }
  };

  const noCats = !cats || cats.length === 0;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif font-bold">Richiedi Preventivo</h1>

      {noCats && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                Nessun animale registrato
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                Per richiedere un preventivo, devi prima registrare i tuoi animali nella sezione "I Miei Animali".
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/cliente/animali")}>
                Registra Animali
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!noCats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuova Richiesta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Check-in *</Label>
                  <Input
                    type="date"
                    min={today}
                    value={form.check_in_date}
                    onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Check-out *</Label>
                  <Input
                    type="date"
                    min={form.check_in_date || today}
                    value={form.check_out_date}
                    onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Availability alert */}
              {availabilityStatus && (
                noAvailability ? (
                  <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">
                      <p className="font-medium">
                        Spiacenti, non ci sono casette disponibili per le date selezionate.
                      </p>
                      {tenant?.phone && (
                        <p className="text-sm mt-1">
                          Contattaci al{" "}
                          <a href={`tel:${tenant.phone}`} className="underline font-semibold">{tenant.phone}</a>{" "}
                          per trovare una soluzione insieme.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="ml-2 font-medium">
                      Disponibilità confermata per le date selezionate
                      {availabilityStatus.freeSingole > 0 && ` · ${availabilityStatus.freeSingole} singol${availabilityStatus.freeSingole === 1 ? "a" : "e"}`}
                      {availabilityStatus.freeDoppie > 0 && ` · ${availabilityStatus.freeDoppie} doppi${availabilityStatus.freeDoppie === 1 ? "a" : "e"}`}
                    </AlertDescription>
                  </Alert>
                )
              )}

              <div className="space-y-3">
                <Label>Seleziona i tuoi animali *</Label>
                <div className="grid gap-2">
                  {cats?.map((cat: any) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedCats.includes(cat.id)}
                        onCheckedChange={() => toggleCat(cat.id)}
                      />
                      <span className="text-lg">{cat.pet_type === "cani" ? "🐕" : "🐱"}</span>
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[cat.breed, cat.color].filter(Boolean).join(" · ") || ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Note aggiuntive</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Esigenze particolari, richieste speciali..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={createRequest.isPending || selectedCats.length === 0}>
                <Send className="mr-2 h-4 w-4" />
                {createRequest.isPending ? "Invio in corso..." : "Invia Richiesta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
