import { useClienteProfile, useClienteCats, useClienteBookings, useClienteTenant, useClienteQuoteRequests } from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, PawPrint, User, AlertTriangle, CheckCircle2, FilePlus, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  preventivo: "Preventivo",
  confermata: "Confermata",
  appuntamento_fissato: "Appuntamento fissato",
  appuntamento_in_fissato: "App. IN fissato",
  appuntamento_out_fissato: "App. OUT fissato",
  appuntamento_in_out_fissato: "App. IN-OUT fissati",
  check_in: "Check-in",
  in_corso: "In corso",
  check_out: "Check-out",
  chiusa: "Chiusa",
  cancellata: "Cancellata",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  reviewed: "In lavorazione",
  converted: "Convertita",
  rejected: "Rifiutata",
};

const QUOTE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  reviewed: "default",
  converted: "default",
  rejected: "destructive",
};

export default function ClienteDashboard() {
  const { data: profile } = useClienteProfile();
  const { data: cats } = useClienteCats();
  const { data: bookings } = useClienteBookings();
  const { data: tenant } = useClienteTenant();
  const { data: quoteRequests } = useClienteQuoteRequests();

  // Profile completeness check
  const missingFields: string[] = [];
  if (!profile?.phone) missingFields.push("telefono");
  if (!profile?.fiscal_code) missingFields.push("codice fiscale");
  if (!profile?.address) missingFields.push("indirizzo");
  if (!cats || cats.length === 0) missingFields.push("animali");

  const preventivi = bookings?.filter((b) => b.status === "preventivo") || [];
  const attive = bookings?.filter((b) => 
    ["confermata", "appuntamento_fissato", "appuntamento_in_fissato", "appuntamento_out_fissato", "appuntamento_in_out_fissato", "check_in", "in_corso"].includes(b.status)
  ) || [];

  const pendingRequests = quoteRequests?.filter((q: any) => q.status === "pending") || [];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Benvenuto, {profile?.first_name}! 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {tenant?.name ? `La tua area riservata presso ${tenant.name}` : "La tua area riservata"}
        </p>
      </div>

      {/* Profile completeness alert */}
      {missingFields.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                Completa il tuo profilo
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                Mancano: {missingFields.join(", ")}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to="/cliente/profilo">Completa</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{preventivi.length}</p>
              <p className="text-xs text-muted-foreground">Preventivi in attesa</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attive.length}</p>
              <p className="text-xs text-muted-foreground">Prenotazioni attive</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Send className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">Richieste inviate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <PawPrint className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cats?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Animali registrati</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/cliente/richiedi-preventivo">
            <FilePlus className="mr-2 h-4 w-4" />
            Richiedi Preventivo
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cliente/animali">
            <PawPrint className="mr-2 h-4 w-4" />
            Gestisci Animali
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cliente/profilo">
            <User className="mr-2 h-4 w-4" />
            Il Mio Profilo
          </Link>
        </Button>
      </div>

      {/* Quote requests */}
      {quoteRequests && quoteRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le mie richieste di preventivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quoteRequests.slice(0, 5).map((q: any) => (
                <div key={q.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {format(new Date(q.check_in_date), "dd MMM yyyy", { locale: it })} → {format(new Date(q.check_out_date), "dd MMM yyyy", { locale: it })}
                    </p>
                    <Badge variant={QUOTE_STATUS_VARIANT[q.status] || "secondary"}>
                      {QUOTE_STATUS_LABELS[q.status] || q.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    🐾 {q.pet_names || `${q.num_pets} animale/i`}
                    {q.notes && ` · ${q.notes.substring(0, 50)}${q.notes.length > 50 ? "..." : ""}`}
                  </p>
                  {q.status === "rejected" && q.rejection_reason && (
                    <div className="text-xs text-destructive mt-1 space-y-1">
                      <p>❌ Motivo: {q.rejection_reason}</p>
                      {tenant?.phone && (
                        <p>
                          Per trovare una soluzione insieme, contattaci al{" "}
                          <a href={`tel:${tenant.phone}`} className="underline font-medium">{tenant.phone}</a>.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent bookings */}
      {bookings && bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ultime pratiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookings.slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">Pratica #{b.booking_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.check_in_date), "dd MMM yyyy", { locale: it })} → {format(new Date(b.check_out_date), "dd MMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {b.total_amount != null && (
                      <span className="text-sm font-medium">€ {Number(b.total_amount).toFixed(2)}</span>
                    )}
                    <Badge variant={b.status === "preventivo" ? "secondary" : b.status === "cancellata" ? "destructive" : "default"}>
                      {STATUS_LABELS[b.status] || b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {bookings.length > 5 && (
              <div className="mt-3 text-center">
                <Link to="/cliente/preventivi" className="text-sm text-primary hover:underline">
                  Vedi tutti →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
