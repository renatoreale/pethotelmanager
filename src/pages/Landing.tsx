import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import {
  PawPrint, Calendar, Users, CreditCard, FileText, BarChart3,
  Check, Star, ArrowRight, Shield, Clock, Zap, Building2, Crown, Video, Send,
  X, AlertTriangle, Heart, TrendingUp, Phone, Monitor
} from "lucide-react";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

import screenshotDashboard from "@/assets/screenshots/dashboard.png";
import screenshotAppuntamenti from "@/assets/screenshots/appuntamenti.png";
import screenshotAppuntamenti2 from "@/assets/screenshots/appuntamenti2.png";
import screenshotPreventivi from "@/assets/screenshots/preventivi.png";
import screenshotOccupazione from "@/assets/screenshots/occupazione.png";
import screenshotPrenotazioni from "@/assets/screenshots/prenotazioni.png";
import screenshotRegistro from "@/assets/screenshots/registro.png";
import screenshotAreaCliente from "@/assets/screenshots/area-cliente.png";
import screenshotAreaCliente2 from "@/assets/screenshots/area-cliente2.png";
import screenshotCheckin from "@/assets/screenshots/checkin.png";

const SCREENSHOTS = [
  { src: screenshotDashboard, alt: "Dashboard operativa", desc: "Dashboard operativa — panoramica completa su prenotazioni, presenze, check-in/out e incassi in un colpo d'occhio." },
  { src: screenshotPreventivi, alt: "Gestione preventivi", desc: "Gestione preventivi — crea e invia preventivi ai clienti, gestisci le richieste dal portale clienti." },
  { src: screenshotPrenotazioni, alt: "Gestione prenotazioni", desc: "Gestione prenotazioni — workflow completo dalla conferma al check-out, con azioni rapide e filtri per stato." },
  { src: screenshotAppuntamenti, alt: "Calendario appuntamenti", desc: "Calendario appuntamenti — pianifica check-in e check-out con vista lista e prenotazioni da fissare." },
  { src: screenshotAppuntamenti2, alt: "Vista calendario mensile", desc: "Vista calendario mensile — tutti gli appuntamenti di check-in e check-out a colpo d'occhio." },
  { src: screenshotOccupazione, alt: "Occupazione casette", desc: "Occupazione casette — griglia visuale con occupazione giornaliera per singole e doppie, divise per tipo di Pet." },
  { src: screenshotCheckin, alt: "Check-in dettagliato", desc: "Check-in — accettazione animali con riepilogo soggiorno, pagamenti e transazioni per ogni prenotazione." },
  { src: screenshotRegistro, alt: "Registro animali", desc: "Registro animali — traccia ingressi e uscite con microchip, razza, sesso e stato di presenza." },
  { src: screenshotAreaCliente, alt: "Area riservata cliente", desc: "Area riservata cliente — il tuo cliente può vedere prenotazioni, richiedere preventivi e gestire i propri animali." },
  { src: screenshotAreaCliente2, alt: "Preventivi cliente", desc: "Portale cliente — dettaglio pratiche con stato pagamenti, download preventivi e moduli di affido." },
];

/* ── Feature lists per pricing ── */
const STARTER_FEATURES = [
  "Creazione preventivi",
  "Gestione prenotazioni",
  "Documenti PDF",
  "Calendario appuntamenti",
  "Anagrafica clienti",
  "Registro presenze",
  "Occupazione casette",
  "Report e statistiche",
  "Area riservata per cliente",
];
const PRO_FEATURES = [
  "Tutto del piano Starter",
  "Multi-pensione (fino a 3)",
  "Dashboard multi-sede",
];
const BUSINESS_FEATURES = [
  "Tutto del piano Pro",
  "Multi-pensione (fino a 10)",
  "Supporto prioritario",
  "Configurazione dedicata",
];

/* ── BENEFICI (non funzioni!) ── */
const BENEFITS = [
  {
    icon: Calendar,
    title: "Zero overbooking",
    desc: "Il calendario in tempo reale ti mostra subito le casette libere. Mai più doppie prenotazioni o clienti delusi.",
    before: "Controllo manuale su fogli Excel, errori frequenti",
  },
  {
    icon: Clock,
    title: "Risparmia 10+ ore a settimana",
    desc: "Preventivi automatici, PDF pronti in un click, check-in/out guidati. Il lavoro manuale ripetitivo sparisce.",
    before: "Ore perse a compilare fogli, scrivere email, calcolare prezzi",
  },
  {
    icon: CreditCard,
    title: "Pagamenti sempre sotto controllo",
    desc: "Caparre, saldi, rimborsi: tutto tracciato. Sai sempre chi ha pagato, quanto e quando.",
    before: "Post-it, promemoria mentali, caparre dimenticate",
  },
  {
    icon: PawPrint,
    title: "Schede animali complete",
    desc: "Microchip, dieta, allergie, note comportamentali: tutto a portata di mano quando serve davvero.",
    before: "Informazioni sparse su carta, WhatsApp, fogli volanti",
  },
  {
    icon: BarChart3,
    title: "Decisioni basate sui dati",
    desc: "Statistiche su occupazione, fatturato e tendenze per capire come far crescere la tua pensione.",
    before: "Nessuna visibilità su ricavi, periodi di punta, trend",
  },
  {
    icon: Building2,
    title: "Multi-sede? Nessun problema",
    desc: "Gestisci più pensioni da un'unica dashboard, ognuna con i propri dati, listini e configurazioni.",
    before: "Fogli separati per ogni sede, impossibile avere una visione d'insieme",
  },
];

/* ── Problemi (sezione "Prima di PHM") ── */
const PAIN_POINTS = [
  { icon: X, text: "Prenotazioni su carta, Excel o WhatsApp" },
  { icon: X, text: "Overbooking e casette doppie" },
  { icon: X, text: "Ore perse a fare preventivi a mano" },
  { icon: X, text: "Pagamenti non tracciati, caparre dimenticate" },
  { icon: X, text: "Nessuna visione d'insieme sulla tua pensione" },
];

/* ── Demo Form ── */
function DemoRequestForm() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", pensione_name: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e email sono obbligatori");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-demo-validation", {
        body: {
          firstName: form.name,
          lastName: "",
          email: form.email,
          phone: form.phone,
          pensioneName: form.pensione_name,
          message: form.message,
          leadType: "demo_live",
          baseUrl: window.location.origin,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Richiesta inviata! Ti contatteremo a breve.");
    } catch {
      toast.error("Errore nell'invio. Riprova più tardi.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="py-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Richiesta Inviata!</h3>
          <p className="text-muted-foreground">Ti contatteremo a breve per fissare la demo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Prenota la tua demo gratuita</CardTitle>
        <CardDescription>Ti ricontatteremo entro 24h — zero impegno</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-name">Nome e Cognome *</Label>
            <Input id="demo-name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mario Rossi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-email">Email *</Label>
            <Input id="demo-email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="mario@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-phone">Telefono</Label>
            <Input id="demo-phone" type="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+39 333 1234567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-pensione">Nome della tua Pensione</Label>
            <Input id="demo-pensione" maxLength={100} value={form.pensione_name} onChange={(e) => setForm({ ...form, pensione_name: e.target.value })} placeholder="La Pensione dei Mici" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-message">Messaggio</Label>
            <Textarea id="demo-message" maxLength={500} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Quanti animali gestisci? Cosa ti serve?" />
          </div>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? "Invio in corso..." : "Richiedi Demo Gratuita"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


/* ══════════════ LANDING PAGE ══════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    supabase.from("landing_config").select("*").limit(1).single().then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowNav(false);
    const onScroll = () => setShowNav(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleStartTrial = () => navigate("/register-trial");

  const handleSubscribe = async (priceId: string, planName: string) => {
    setLoadingPlan(planName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/register-trial"); return; }
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Errore durante il checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const trialDays = config?.trial_days || 14;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pet Hotel Manager",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Software gestionale completo per pensioni per cani e gatti. Gestisci prenotazioni, pagamenti, clienti e animali.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: STRIPE_TIERS.starter.priceYearly,
      highPrice: STRIPE_TIERS.business.priceYearly,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Navbar (appare dopo scroll) ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b transition-transform duration-300 ${showNav ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold text-foreground">Pet Hotel Manager</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#demo">
              <Button variant="ghost" size="sm">Demo Gratuita</Button>
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Accedi</Button>
            </Link>
            <Button size="sm" onClick={handleStartTrial} className="gap-1">
              Prova Gratis <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ══════════ 1. HERO — Benefit-driven ══════════ */}
      <header className="relative min-h-screen flex flex-col items-center justify-start pt-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="relative flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
          <img
            src={landingLogo}
            alt="Pet Hotel Manager - Software gestionale per pensioni per cani e gatti"
            className="w-[280px] md:w-[380px] lg:w-[440px] h-auto object-contain drop-shadow-xl"
          />

          <Badge className="mt-6 mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-sm px-4 py-1.5">
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Prova gratis {trialDays} giorni — nessuna carta richiesta
          </Badge>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-4">
            Gestisci la tua pensione per animali
            <span className="text-primary block mt-1">in un solo software</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Basta Excel, post-it e WhatsApp.
            <strong className="text-foreground"> Pet Hotel Manager</strong> automatizza prenotazioni, pagamenti e comunicazioni
            — così risparmi <strong className="text-foreground">ore ogni settimana</strong> e non perdi più una prenotazione.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Prova Gratis — {trialDays} Giorni <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Video className="h-4 w-4" /> Richiedi una Demo Live</a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Nessuna carta di credito</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Attivo in 2 minuti</span>
            <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> Usato da pensioni in tutto il mondo</span>
          </div>
        </div>
      </header>

      {/* ══════════ 2. IL PROBLEMA — "Ti riconosci?" ══════════ */}
      <section className="py-20 bg-destructive/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Il problema
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Gestire una pensione senza un gestionale è un incubo
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Se ti riconosci in uno di questi problemi, stai perdendo tempo e soldi ogni giorno.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-background border border-destructive/10">
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <p.icon className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-sm text-foreground font-medium leading-snug">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 3. LA SOLUZIONE — Benefici (non funzioni) ══════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Zap className="h-3.5 w-3.5 mr-1.5" /> La soluzione
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Ecco cosa cambia con Pet Hotel Manager
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Non ti elenchiamo funzioni. Ti mostriamo i <strong className="text-foreground">risultati concreti</strong> che ottieni.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="border-none bg-card shadow-md hover:shadow-lg transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{b.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                  <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-destructive/70 bg-destructive/5 px-2 py-1 rounded">Prima:</span>
                    <p className="text-xs text-muted-foreground italic">{b.before}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 3b. SCREENSHOT CAROUSEL ══════════ */}
      <section className="py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Monitor className="h-3.5 w-3.5 mr-1.5" /> Scopri l'interfaccia
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Un'occhiata al software
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ecco come si presenta Pet Hotel Manager nel quotidiano.
            </p>
          </div>
          <Carousel
            opts={{ loop: true, align: "center" }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
            className="w-full"
          >
            <CarouselContent>
              {SCREENSHOTS.map((s, i) => (
                <CarouselItem key={i} className="md:basis-4/5 lg:basis-3/4">
                  <div className="p-2">
                    <div className="rounded-xl border-2 border-border overflow-hidden shadow-lg bg-background">
                      <img
                        src={s.src}
                        alt={s.alt}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
                      {s.desc}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 md:-left-6" />
            <CarouselNext className="-right-4 md:-right-6" />
          </Carousel>
        </div>
      </section>


      <section className="py-20 bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          {/* Numeri */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">50+</div>
              <div className="text-muted-foreground text-sm mt-1">Pensioni attive</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">10.000+</div>
              <div className="text-muted-foreground text-sm mt-1">Prenotazioni gestite</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">4.9★</div>
              <div className="text-muted-foreground text-sm mt-1">Valutazione media</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">10h+</div>
              <div className="text-muted-foreground text-sm mt-1">Risparmiate a settimana</div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════ 5. CTA intermedio ══════════ */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            Pronto a dire addio al caos?
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Inizia la prova gratuita di {trialDays} giorni. Nessuna carta, nessun impegno, disdici quando vuoi.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Crea il tuo account gratis <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Phone className="h-4 w-4" /> Parla con noi</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════ 6. PRICING ══════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Un prezzo semplice per ogni esigenza
            </h2>
            <p className="text-muted-foreground text-lg">
              Tutti i piani includono <strong className="text-foreground">{trialDays} giorni gratis</strong>. Scegli quello giusto per te.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Starter</CardTitle>
                <CardDescription>Per iniziare a gestire la tua pensione</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.starter.priceMonthly}</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">€{STRIPE_TIERS.starter.priceYearly}/anno con abbonamento annuale</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" size="lg" disabled={loadingPlan === "starter"} onClick={() => handleSubscribe(STRIPE_TIERS.starter.price_id, "starter")}>
                  {loadingPlan === "starter" ? "Caricamento..." : "Inizia con Starter"}
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-2 border-primary shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1"><Star className="h-3 w-3" /> Più scelto</Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Pro</CardTitle>
                <CardDescription>Per pensioni multi-sede</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.pro.priceMonthly}</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">€{STRIPE_TIERS.pro.priceYearly}/anno con abbonamento annuale</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" disabled={loadingPlan === "pro"} onClick={() => handleSubscribe(STRIPE_TIERS.pro.price_id, "pro")}>
                  {loadingPlan === "pro" ? "Caricamento..." : "Inizia con Pro"}
                </Button>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="relative border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white gap-1"><Crown className="h-3 w-3" /> Business</Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Business</CardTitle>
                <CardDescription>Per grandi strutture multi-sede</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.business.priceMonthly}</span>
                  <span className="text-muted-foreground">/mese</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">€{STRIPE_TIERS.business.priceYearly}/anno con abbonamento annuale</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {BUSINESS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" size="lg" disabled={loadingPlan === "business"} onClick={() => handleSubscribe(STRIPE_TIERS.business.price_id, "business")}>
                  {loadingPlan === "business" ? "Caricamento..." : "Inizia con Business"}
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Tutti i piani includono {trialDays} giorni di prova gratuita. Nessuna carta di credito richiesta.
          </p>
        </div>
      </section>

      {/* ══════════ 7. DEMO LIVE ══════════ */}
      <section id="demo" className="py-24 bg-card/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                <Video className="h-3.5 w-3.5 mr-1.5" /> Demo personalizzata
              </Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                Vuoi vederlo in azione?
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Prenota una demo gratuita di 30 minuti. Ti mostriamo come Pet Hotel Manager può risolvere i problemi specifici della <strong className="text-foreground">tua</strong> pensione.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Demo personalizzata sulle tue esigenze</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Nessun impegno di acquisto</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Risposte a tutte le tue domande</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Ti aiutiamo con la configurazione iniziale</li>
              </ul>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* ══════════ 8. CTA FINALE ══════════ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Non perdere un'altra prenotazione.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Ogni giorno senza un gestionale è un giorno di lavoro in più, prenotazioni perse e clienti insoddisfatti.
            <strong className="text-foreground"> Inizia oggi — è gratis.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-10 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Prova Gratis — {trialDays} Giorni <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Video className="h-4 w-4" /> Richiedi Demo</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Nessuna carta di credito • Attivo in 2 minuti • Disdici quando vuoi
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src={landingLogo} alt="Pet Hotel Manager" className="h-8 w-auto object-contain" /> Pet Hotel Manager © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/termini" className="hover:text-foreground transition-colors">Termini</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Accedi</Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Prezzi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
