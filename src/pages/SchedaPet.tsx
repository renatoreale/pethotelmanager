import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCat } from "@/hooks/useCats";
import { usePetBookings } from "@/hooks/useBookings";
import { useDocumentsForBookings } from "@/hooks/useDocuments";
import { usePetLabels } from "@/hooks/usePetLabels";
import { CatDialog } from "@/components/cats/CatDialog";
import { CarePlanDialog } from "@/components/bookings/CarePlanDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Pencil, Cat as CatIcon, Dog, PawPrint, FileText,
  UtensilsCrossed, Pill, Heart, Home, History, ClipboardList,
} from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { it } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivo",
  confermata: "Confermata",
  appuntamento_in_fissato: "App. IN fissato",
  appuntamento_out_fissato: "App. OUT fissato",
  appuntamento_in_out_fissato: "App. IN/OUT fissato",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
  rimborsata: "Rimborsata",
  scaduto: "Scaduto",
};

const STATUS_COLORS: Record<string, string> = {
  preventivo: "bg-muted text-muted-foreground",
  confermata: "bg-primary/15 text-primary",
  check_in: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  in_corso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  check_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  chiusa: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/15 text-destructive",
  rimborsata: "bg-destructive/15 text-destructive",
  scaduto: "bg-warning/15 text-warning",
};

const ACTIVE_STAY_STATUSES = ["check_in", "in_corso", "check_out"];

function calcNetPaid(payments: any[]) {
  const paid = payments
    .filter((p: any) => p.payment_type !== "rimborso" && p.payment_type !== "gestione_pratica")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const refunded = payments
    .filter((p: any) => p.payment_type === "rimborso")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  return paid - refunded;
}
function calcRemaining(b: any) {
  return Math.max(0, Number(b.total_amount ?? 0) - calcNetPaid(b.payments ?? []));
}
function calcExtraTotal(b: any) {
  return (b.payments ?? []).filter((p: any) => p.payment_type === "extra").reduce((s: number, p: any) => s + Number(p.amount), 0);
}

function formatAge(birthDate: string | null) {
  if (!birthDate) return null;
  const dob = new Date(birthDate + "T00:00:00");
  const years = differenceInYears(new Date(), dob);
  if (years >= 1) return `${years} ${years === 1 ? "anno" : "anni"}`;
  const months = differenceInMonths(new Date(), dob);
  return `${months} ${months === 1 ? "mese" : "mesi"}`;
}

export default function SchedaPet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pet = usePetLabels();
  const { data: cat, isLoading } = useCat(id);
  const { data: bookings } = usePetBookings(id);
  const [editOpen, setEditOpen] = useState(false);
  const [carePlanOpen, setCarePlanOpen] = useState(false);

  const bookingIds = useMemo(() => (bookings ?? []).map((b: any) => b.id), [bookings]);
  const { data: documents } = useDocumentsForBookings(bookingIds);

  const currentBooking = useMemo(
    () => (bookings ?? []).find((b: any) => ACTIVE_STAY_STATUSES.includes(b.status)),
    [bookings]
  );
  const pastBookings = useMemo(
    () => (bookings ?? []).filter((b: any) => b.id !== currentBooking?.id),
    [bookings, currentBooking]
  );

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Caricamento...</div>;
  }

  if (!cat) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{pet.singularCap} non trovato.</p>
        <Button variant="outline" onClick={() => navigate("/gatti")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna a {pet.pluralCap}
        </Button>
      </div>
    );
  }

  const PetIcon = (cat as any).pet_type === "cani" ? Dog : (cat as any).pet_type === "gatti" ? CatIcon
    : pet.iconName === "Cat" ? CatIcon : pet.iconName === "Dog" ? Dog : PawPrint;
  const age = formatAge((cat as any).birth_date);
  const clientName = (cat as any).clients ? `${(cat as any).clients.last_name} ${(cat as any).clients.first_name}` : "—";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/gatti" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Torna a {pet.pluralCap}
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={(cat as any).photo_url ?? undefined} alt={cat.name} />
            <AvatarFallback><PetIcon className="h-7 w-7 text-primary" /></AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{cat.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {clientName}
              {(cat as any).breed && ` · ${(cat as any).breed}`}
              {age && ` · ${age}`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Modifica dati anagrafici
        </Button>
      </div>

      {currentBooking && (
        <Badge className="bg-success/15 text-success border-success/20 gap-1.5">
          <Home className="h-3.5 w-3.5" /> Attualmente ospite — {STATUS_LABELS[currentBooking.status] ?? currentBooking.status}
        </Badge>
      )}

      <Tabs defaultValue="panoramica" className="space-y-4">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="panoramica" className="gap-2 whitespace-nowrap"><PetIcon className="h-4 w-4" /> Panoramica</TabsTrigger>
            <TabsTrigger value="soggiorno" className="gap-2 whitespace-nowrap"><Home className="h-4 w-4" /> Soggiorno attuale</TabsTrigger>
            <TabsTrigger value="alimentazione" className="gap-2 whitespace-nowrap"><UtensilsCrossed className="h-4 w-4" /> Alimentazione</TabsTrigger>
            <TabsTrigger value="farmaci" className="gap-2 whitespace-nowrap"><Pill className="h-4 w-4" /> Farmaci</TabsTrigger>
            <TabsTrigger value="comportamento" className="gap-2 whitespace-nowrap"><Heart className="h-4 w-4" /> Comportamento</TabsTrigger>
            <TabsTrigger value="documenti" className="gap-2 whitespace-nowrap"><FileText className="h-4 w-4" /> Documenti</TabsTrigger>
            <TabsTrigger value="storico" className="gap-2 whitespace-nowrap"><History className="h-4 w-4" /> Storico</TabsTrigger>
          </TabsList>
        </div>

        {/* PANORAMICA */}
        <TabsContent value="panoramica">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Dati principali</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <Field label="Proprietario" value={clientName} />
              <Field label="Razza" value={(cat as any).breed} />
              <Field label="Colore" value={(cat as any).color} />
              <Field label="Sesso" value={(cat as any).gender === "M" ? "Maschio" : (cat as any).gender === "F" ? "Femmina" : null} />
              <Field label="Data di nascita" value={(cat as any).birth_date ? format(new Date((cat as any).birth_date + "T00:00:00"), "dd MMMM yyyy", { locale: it }) : null} />
              <Field label="Peso" value={(cat as any).weight_kg ? `${(cat as any).weight_kg} kg` : null} />
              <Field label="Microchip" value={(cat as any).microchip} mono />
              <Field label="Sterilizzato" value={(cat as any).is_neutered ? "Sì" : "No"} />
              <Field label="Alloggio richiesto" value={(cat as any).needs_double_cage ? "Casetta doppia" : "Casetta singola"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOGGIORNO ATTUALE */}
        <TabsContent value="soggiorno">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Soggiorno attuale</CardTitle>
              {currentBooking && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCarePlanOpen(true)}>
                  <ClipboardList className="h-3.5 w-3.5" /> Piano di cura
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!currentBooking ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessun soggiorno in corso.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <Field label="Check-in" value={format(new Date(currentBooking.check_in_date + "T00:00:00"), "dd MMM yyyy", { locale: it })} />
                  <Field label="Check-out" value={format(new Date(currentBooking.check_out_date + "T00:00:00"), "dd MMM yyyy", { locale: it })} />
                  <Field label="Alloggio" value={currentBooking.cage_pool_type === "singola" ? "Singola" : "Doppia"} />
                  <Field label="Stato" value={STATUS_LABELS[currentBooking.status] ?? currentBooking.status} />
                  <Field label="Totale soggiorno" value={`€ ${Number(currentBooking.total_amount ?? 0).toLocaleString("it-IT")}`} />
                  <Field label="Saldo" value={`€ ${calcRemaining(currentBooking).toLocaleString("it-IT")}`} />
                  {calcExtraTotal(currentBooking) > 0 && <Field label="Extra" value={`€ ${calcExtraTotal(currentBooking).toLocaleString("it-IT")}`} />}
                  {currentBooking.notes && <Field label="Note" value={currentBooking.notes} full />}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALIMENTAZIONE */}
        <TabsContent value="alimentazione">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Alimentazione</CardTitle></CardHeader>
            <CardContent>
              <NotesBlock text={(cat as any).dietary_notes} empty="Nessuna informazione alimentare registrata." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FARMACI */}
        <TabsContent value="farmaci">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Farmaci e note mediche</CardTitle></CardHeader>
            <CardContent>
              <NotesBlock text={(cat as any).medical_notes} empty="Nessuna informazione medica registrata." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPORTAMENTO */}
        <TabsContent value="comportamento">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Comportamento</CardTitle></CardHeader>
            <CardContent>
              <NotesBlock text={(cat as any).behavioral_notes} empty="Nessuna nota comportamentale registrata." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTI */}
        <TabsContent value="documenti">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Documenti</CardTitle></CardHeader>
            <CardContent>
              {!documents?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessun documento caricato.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type} · {format(new Date(doc.created_at), "dd MMM yyyy", { locale: it })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORICO */}
        <TabsContent value="storico">
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">Soggiorni precedenti</CardTitle></CardHeader>
            <CardContent>
              {pastBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessun soggiorno precedente.</p>
              ) : (
                <div className="space-y-2">
                  {pastBookings.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(b.check_in_date + "T00:00:00"), "dd MMM yyyy", { locale: it })}
                          {" → "}
                          {format(new Date(b.check_out_date + "T00:00:00"), "dd MMM yyyy", { locale: it })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.booking_number} · {b.cage_pool_type === "singola" ? "Singola" : "Doppia"} · € {Number(b.total_amount ?? 0).toLocaleString("it-IT")}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] ?? ""}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CatDialog open={editOpen} onOpenChange={setEditOpen} cat={cat} />
      <CarePlanDialog open={carePlanOpen} onOpenChange={setCarePlanOpen} booking={currentBooking ?? null} />
    </div>
  );
}

function Field({ label, value, mono, full }: { label: string; value: string | null | undefined; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function NotesBlock({ text, empty }: { text: string | null | undefined; empty: string }) {
  if (!text) return <p className="text-sm text-muted-foreground text-center py-6">{empty}</p>;
  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>;
}
