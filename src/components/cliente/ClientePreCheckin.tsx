import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ChevronLeft, ChevronRight, PawPrint, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useClienteProfile, useClienteCats, useUpdateClienteProfile } from "@/hooks/useClienteAuth";
import { usePreCheckinSubmission, useUpsertPreCheckinSubmission } from "@/hooks/usePreCheckin";
import { ClientePreCheckinDocs } from "@/components/cliente/ClientePreCheckinDocs";

interface Props {
  bookingId: string;
  clientId: string;
  tenantId: string;
  booking: any;
}

const STEPS = [
  "Dati proprietario", "Dati pet", "Alimentazione", "Farmaci",
  "Contatto emergenza", "Documenti", "Consensi", "Conferma",
];

export function ClientePreCheckin({ bookingId, clientId, tenantId, booking }: Props) {
  const supabase = useSupabase();
  const { data: profile } = useClienteProfile();
  const { data: allCats } = useClienteCats();
  const updateProfile = useUpdateClienteProfile();
  const { data: submission } = usePreCheckinSubmission(bookingId);
  const upsertSubmission = useUpsertPreCheckinSubmission();

  const { data: tenantVersions } = useQuery({
    queryKey: ["cliente-tenant-versions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("regolamento_version, privacy_version")
        .eq("id", tenantId)
        .single();
      if (error) throw error;
      return data as { regolamento_version: string | null; privacy_version: string | null };
    },
    enabled: !!tenantId,
  });

  const bookingCatIds = useMemo(
    () => (booking?.booking_cats ?? []).map((bc: any) => bc.cat_id).filter(Boolean),
    [booking?.booking_cats]
  );
  const pets = useMemo(
    () => (allCats ?? []).filter((c: any) => bookingCatIds.includes(c.id)),
    [allCats, bookingCatIds]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [feedingNotes, setFeedingNotes] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [regolamentoAccepted, setRegolamentoAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submission) {
      setFeedingNotes(submission.feeding_notes ?? "");
      setMedicationNotes(submission.medication_notes ?? "");
      setRegolamentoAccepted(
        !!submission.regolamento_accepted_version &&
        submission.regolamento_accepted_version === (tenantVersions?.regolamento_version ?? null)
      );
      setPrivacyAccepted(
        !!submission.privacy_accepted_version &&
        submission.privacy_accepted_version === (tenantVersions?.privacy_version ?? null)
      );
    }
  }, [submission, tenantVersions]);

  useEffect(() => {
    if (profile) {
      setEmergencyName(profile.emergency_contact_name ?? "");
      setEmergencyPhone(profile.emergency_contact_phone ?? "");
      setEmergencyRelation(profile.emergency_contact_relation ?? "");
    }
  }, [profile]);

  const isCompleted = !!submission?.completed_at;

  const handleSaveEmergencyContact = async () => {
    if (!profile) return;
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_relation: emergencyRelation || null,
      } as any);
      toast.success("Contatto di emergenza salvato");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  const handleConfirm = async () => {
    if (!regolamentoAccepted || !privacyAccepted) {
      toast.error("Devi accettare regolamento e informativa privacy per completare il check-in online");
      return;
    }
    setSaving(true);
    try {
      await upsertSubmission.mutateAsync({
        bookingId, tenantId, clientId,
        feedingNotes: feedingNotes.trim() || null,
        medicationNotes: medicationNotes.trim() || null,
        privacyAcceptedVersion: tenantVersions?.privacy_version ?? "n/d",
        regolamentoAcceptedVersion: tenantVersions?.regolamento_version ?? "n/d",
        consentsAcceptedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      toast.success("Check-in online completato!");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Pre-check-in online</Label>
        {isCompleted ? (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completato
          </Badge>
        ) : (
          <Badge variant="outline">Passo {stepIndex + 1} di {STEPS.length}</Badge>
        )}
      </div>

      {isCompleted && (
        <p className="text-xs text-muted-foreground">
          Check-in online completato il {format(new Date(submission!.completed_at!), "dd MMM yyyy 'alle' HH:mm", { locale: it })}.
          Puoi comunque rivedere o correggere le informazioni qui sotto.
        </p>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStepIndex(i)}
            className={`text-[10px] px-2 py-1 rounded-full border ${
              i === stepIndex ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-muted-foreground/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Separator />

      <div className="min-h-[140px] space-y-3">
        {stepIndex === 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <User className="h-3.5 w-3.5" /> I tuoi dati attuali
            </div>
            <p><strong>{profile?.first_name} {profile?.last_name}</strong></p>
            <p className="text-muted-foreground">{profile?.email}</p>
            <p className="text-muted-foreground">{profile?.phone || "Telefono non indicato"}</p>
            <p className="text-muted-foreground">{profile?.address || "Indirizzo non indicato"}</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/cliente/profilo">Modifica i miei dati</Link>
            </Button>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <PawPrint className="h-3.5 w-3.5" /> Dati dei pet in questo soggiorno
            </div>
            {pets.length === 0 ? (
              <p className="text-muted-foreground text-xs">Nessun pet trovato per questa prenotazione.</p>
            ) : pets.map((cat: any) => (
              <div key={cat.id} className="rounded-md border p-2 space-y-0.5">
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[cat.breed, cat.weight_kg ? `${cat.weight_kg} kg` : null].filter(Boolean).join(" · ") || "Nessun dettaglio"}
                </p>
                {cat.medical_notes && <p className="text-xs">Note mediche: {cat.medical_notes}</p>}
                {cat.dietary_notes && <p className="text-xs">Note alimentari: {cat.dietary_notes}</p>}
                {cat.behavioral_notes && <p className="text-xs">Note comportamentali: {cat.behavioral_notes}</p>}
              </div>
            ))}
            <Button asChild size="sm" variant="outline">
              <Link to="/cliente/animali">Modifica i dati dei miei pet</Link>
            </Button>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="space-y-2">
            <Label className="text-sm">Indicazioni sull'alimentazione per questo soggiorno</Label>
            <p className="text-xs text-muted-foreground">
              Es. orari dei pasti, quantità, cibo da portare. Lo staff le rivede prima dell'arrivo.
            </p>
            <Textarea rows={4} value={feedingNotes} onChange={(e) => setFeedingNotes(e.target.value)} />
          </div>
        )}

        {stepIndex === 3 && (
          <div className="space-y-2">
            <Label className="text-sm">Indicazioni sui farmaci per questo soggiorno</Label>
            <p className="text-xs text-muted-foreground">
              Es. nome farmaco, dose, orari di somministrazione. Lo staff le rivede prima dell'arrivo.
            </p>
            <Textarea rows={4} value={medicationNotes} onChange={(e) => setMedicationNotes(e.target.value)} />
          </div>
        )}

        {stepIndex === 4 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Phone className="h-3.5 w-3.5" /> Contatto di emergenza
            </div>
            <p className="text-xs text-muted-foreground">
              Da contattare se non fossimo in grado di raggiungerti durante il soggiorno.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="Nome e cognome" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)}
              />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="Telefono" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
              />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="Relazione (es. familiare)" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)}
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleSaveEmergencyContact} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvataggio..." : "Salva contatto"}
            </Button>
          </div>
        )}

        {stepIndex === 5 && (
          <ClientePreCheckinDocs bookingId={bookingId} clientId={clientId} />
        )}

        {stepIndex === 6 && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Checkbox checked={regolamentoAccepted} onCheckedChange={(c) => setRegolamentoAccepted(!!c)} className="mt-0.5" />
              <Label className="font-normal">
                Ho letto e accetto il Regolamento della struttura
                {tenantVersions?.regolamento_version && ` (versione: ${tenantVersions.regolamento_version})`}.
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={privacyAccepted} onCheckedChange={(c) => setPrivacyAccepted(!!c)} className="mt-0.5" />
              <Label className="font-normal">
                Ho letto e accetto l'Informativa Privacy
                {tenantVersions?.privacy_version && ` (versione: ${tenantVersions.privacy_version})`}.
              </Label>
            </div>
          </div>
        )}

        {stepIndex === 7 && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">Riepilogo prima di confermare:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Alimentazione: {feedingNotes.trim() || "nessuna indicazione"}</li>
              <li>Farmaci: {medicationNotes.trim() || "nessuna indicazione"}</li>
              <li>Contatto emergenza: {emergencyName.trim() ? `${emergencyName} · ${emergencyPhone}` : "non indicato"}</li>
              <li>Regolamento: {regolamentoAccepted ? "accettato" : "da accettare"}</li>
              <li>Privacy: {privacyAccepted ? "accettata" : "da accettare"}</li>
            </ul>
            <Button onClick={handleConfirm} disabled={saving} className="w-full">
              {saving ? "Salvataggio..." : isCompleted ? "Aggiorna check-in online" : "Completa check-in online"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-1">
        <Button size="sm" variant="ghost" onClick={goBack} disabled={stepIndex === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Indietro
        </Button>
        <Button size="sm" variant="ghost" onClick={goNext} disabled={stepIndex === STEPS.length - 1} className="gap-1">
          Avanti <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
