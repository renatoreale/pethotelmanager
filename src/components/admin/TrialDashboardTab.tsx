import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, differenceInDays, isPast } from "date-fns";
import { it } from "date-fns/locale";
import {
  Users, UserCheck, UserX, Clock, TrendingUp, Mail,
  AlertTriangle, Lightbulb, RefreshCw,
} from "lucide-react";

interface TrialUser {
  id: string;
  email: string;
  full_name: string | null;
  pet_type: string;
  trial_start: string;
  trial_end: string;
  is_converted: boolean;
  converted_at: string | null;
  last_login_at: string | null;
  login_count: number;
  actions_count: number;
  pages_visited: string[];
}

interface ConversionSuggestion {
  userId: string;
  email: string;
  fullName: string;
  urgency: "high" | "medium" | "low";
  reason: string;
  suggestedAction: string;
  emailSubject: string;
  emailBody: string;
}

export function TrialDashboardTab() {
  const [trials, setTrials] = useState<TrialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<ConversionSuggestion[]>([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const fetchTrials = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trial_registrations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTrials(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchTrials(); }, []);

  const totalTrials = trials.length;
  const activeTrials = trials.filter(t => !t.is_converted && !isPast(new Date(t.trial_end))).length;
  const convertedTrials = trials.filter(t => t.is_converted).length;
  const expiredTrials = trials.filter(t => !t.is_converted && isPast(new Date(t.trial_end))).length;
  const conversionRate = totalTrials > 0 ? ((convertedTrials / totalTrials) * 100).toFixed(1) : "0";

  const generateSuggestions = () => {
    setGeneratingSuggestions(true);
    const newSuggestions: ConversionSuggestion[] = [];

    for (const t of trials) {
      if (t.is_converted) continue;

      const daysLeft = differenceInDays(new Date(t.trial_end), new Date());
      const isExpired = isPast(new Date(t.trial_end));
      const name = t.full_name || t.email.split("@")[0];

      if (isExpired) {
        newSuggestions.push({
          userId: t.id,
          email: t.email,
          fullName: name,
          urgency: "high",
          reason: `Trial scaduto da ${Math.abs(daysLeft)} giorni. ${t.login_count} accessi totali, ${t.actions_count} azioni effettuate.`,
          suggestedAction: t.actions_count > 10
            ? "Utente attivo ma non ha convertito. Offrire uno sconto o estensione trial."
            : "Utente poco attivo. Inviare email di re-engagement con video demo.",
          emailSubject: t.actions_count > 10
            ? `${name}, il tuo periodo di prova è terminato — offerta speciale per te!`
            : `${name}, hai perso qualcosa? Riprova CatHotel Manager`,
          emailBody: t.actions_count > 10
            ? `Ciao ${name},\n\nAbbiamo notato che hai usato attivamente CatHotel Manager durante la prova. Il tuo periodo è terminato, ma abbiamo un'offerta speciale per te: 20% di sconto sul primo anno!\n\nNon perdere le funzionalità che hai già configurato.\n\nRispondi a questa email per attivare lo sconto.`
            : `Ciao ${name},\n\nIl tuo periodo di prova di CatHotel Manager è terminato. Forse non hai avuto tempo di esplorare tutte le funzionalità?\n\nTi offriamo 7 giorni extra per provare:\n- Gestione prenotazioni automatizzata\n- Preventivi PDF professionali\n- Dashboard occupazione in tempo reale\n\nRispondi a questa email per riattivare la prova.`,
        });
      } else if (daysLeft <= 3) {
        newSuggestions.push({
          userId: t.id,
          email: t.email,
          fullName: name,
          urgency: "high",
          reason: `Trial scade tra ${daysLeft} giorni. ${t.login_count} accessi, ${t.actions_count} azioni.`,
          suggestedAction: "Inviare reminder urgente con i vantaggi del piano a pagamento.",
          emailSubject: `${name}, il tuo trial scade tra ${daysLeft} giorni`,
          emailBody: `Ciao ${name},\n\nIl tuo periodo di prova di CatHotel Manager scade tra ${daysLeft} giorni.\n\nPer non perdere i dati che hai inserito e continuare a gestire la tua pensione in modo efficiente, passa a un piano a pagamento.\n\nScegli il piano più adatto a te: [link al pricing]\n\nHai domande? Rispondi a questa email!`,
        });
      } else if (daysLeft <= 7 && t.login_count < 3) {
        newSuggestions.push({
          userId: t.id,
          email: t.email,
          fullName: name,
          urgency: "medium",
          reason: `Solo ${t.login_count} accessi in ${14 - daysLeft} giorni di trial. Rischio abbandono.`,
          suggestedAction: "Inviare tutorial personalizzato per il tipo di animale gestito.",
          emailSubject: `${name}, scopri come CatHotel Manager può semplificarti la vita`,
          emailBody: `Ciao ${name},\n\nAbbiamo notato che non hai ancora avuto modo di esplorare tutte le funzionalità di CatHotel Manager.\n\nEcco 3 cose che puoi fare subito:\n1. Aggiungi il tuo primo cliente e animale\n2. Crea un preventivo in 30 secondi\n3. Visualizza l'occupazione della tua pensione\n\nServe aiuto? Rispondi a questa email per una demo personalizzata!`,
        });
      } else if (t.actions_count > 20) {
        newSuggestions.push({
          userId: t.id,
          email: t.email,
          fullName: name,
          urgency: "low",
          reason: `Utente molto attivo (${t.actions_count} azioni, ${t.login_count} accessi). Alta probabilità di conversione.`,
          suggestedAction: "Inviare proposta premium con funzionalità avanzate.",
          emailSubject: `${name}, stai usando CatHotel Manager come un PRO!`,
          emailBody: `Ciao ${name},\n\nComplimenti! Stai sfruttando al meglio CatHotel Manager.\n\nHai considerato il piano Pro? Con il piano Pro ottieni:\n- Multi-pensione (fino a 3 sedi)\n- Report e statistiche avanzate\n- Gestione pagamenti completa\n\nPassa al Pro e porta la tua gestione al livello successivo!`,
        });
      }
    }

    setSuggestions(newSuggestions.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.urgency] - order[b.urgency];
    }));
    setGeneratingSuggestions(false);
  };

  const getTrialStatus = (t: TrialUser) => {
    if (t.is_converted) return <Badge className="bg-accent text-accent-foreground">Convertito</Badge>;
    if (isPast(new Date(t.trial_end))) return <Badge variant="destructive">Scaduto</Badge>;
    const daysLeft = differenceInDays(new Date(t.trial_end), new Date());
    if (daysLeft <= 3) return <Badge className="bg-warning text-warning-foreground">{daysLeft}g rimasti</Badge>;
    return <Badge variant="secondary">{daysLeft}g rimasti</Badge>;
  };

  const getEngagementLevel = (t: TrialUser) => {
    if (t.actions_count > 20 && t.login_count > 5) return <Badge className="bg-accent/10 text-accent">Alto</Badge>;
    if (t.actions_count > 5 || t.login_count > 2) return <Badge variant="secondary">Medio</Badge>;
    return <Badge variant="outline" className="text-destructive border-destructive/30">Basso</Badge>;
  };

  const urgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high": return <Badge variant="destructive">Urgente</Badge>;
      case "medium": return <Badge className="bg-warning text-warning-foreground">Importante</Badge>;
      case "low": return <Badge variant="secondary">Suggerimento</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalTrials}</div>
                <div className="text-xs text-muted-foreground">Totale registrazioni</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <div className="text-2xl font-bold">{activeTrials}</div>
                <div className="text-xs text-muted-foreground">Trial attivi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-accent" />
              <div>
                <div className="text-2xl font-bold">{convertedTrials}</div>
                <div className="text-xs text-muted-foreground">Convertiti</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{expiredTrials}</div>
                <div className="text-xs text-muted-foreground">Scaduti</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <div className="text-xs text-muted-foreground">Tasso conversione</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trial users table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Utenti Trial</CardTitle>
            <CardDescription>Tutti gli utenti registrati per la prova gratuita</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTrials} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Aggiorna
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Caricamento...</div>
          ) : !trials.length ? (
            <div className="py-12 text-center text-muted-foreground">Nessuna registrazione trial</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Registrazione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Accessi</TableHead>
                    <TableHead>Azioni</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Ultimo accesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trials.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{t.full_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{t.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.pet_type === "gatti" ? "🐱" : t.pet_type === "cani" ? "🐶" : "🐾"} {t.pet_type}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(t.trial_start), "dd MMM yyyy", { locale: it })}
                      </TableCell>
                      <TableCell>{getTrialStatus(t)}</TableCell>
                      <TableCell className="font-mono text-sm">{t.login_count}</TableCell>
                      <TableCell className="font-mono text-sm">{t.actions_count}</TableCell>
                      <TableCell>{getEngagementLevel(t)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.last_login_at ? format(new Date(t.last_login_at), "dd/MM HH:mm") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Suggestions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" /> Suggerimenti di Conversione
            </CardTitle>
            <CardDescription>Analisi automatica degli utenti trial con suggerimenti e template email</CardDescription>
          </div>
          <Button onClick={generateSuggestions} disabled={generatingSuggestions} className="gap-2">
            <Lightbulb className="h-4 w-4" />
            {generatingSuggestions ? "Analisi..." : "Genera Suggerimenti"}
          </Button>
        </CardHeader>
        <CardContent>
          {!suggestions.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Clicca "Genera Suggerimenti" per analizzare gli utenti trial e ottenere consigli personalizzati
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((s, i) => (
                <Card key={i} className="border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {urgencyBadge(s.urgency)}
                        <span className="font-medium">{s.fullName}</span>
                        <span className="text-sm text-muted-foreground">{s.email}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{s.reason}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{s.suggestedAction}</span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="h-4 w-4" /> Email suggerita
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Oggetto:</span>{" "}
                        <span className="font-medium">{s.emailSubject}</span>
                      </div>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-background rounded p-3 border">
                        {s.emailBody}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
