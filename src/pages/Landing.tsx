import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";
import { PurchaseRequestDialog } from "@/components/PurchaseRequestDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STRIPE_TIERS } from "@/lib/stripe-config";
import { trackDemoRequest } from "@/lib/gtagConversions";
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
  Check, ArrowRight, Shield, Clock, Zap, Crown, Video, Send,
  X, AlertTriangle, Heart, TrendingUp, Phone, Monitor,
  LogOut, Star, ClipboardCheck
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
  { src: screenshotCheckin, alt: "Check-in dettagliato", desc: "Check-in — accettazione Pet con riepilogo soggiorno, pagamenti e transazioni per ogni prenotazione." },
  { src: screenshotRegistro, alt: "Registro Pets", desc: "Registro Pet — traccia ingressi e uscite con microchip, razza, sesso e stato di presenza." },
  { src: screenshotAreaCliente, alt: "Area riservata cliente", desc: "Area riservata cliente — il tuo cliente può vedere prenotazioni, richiedere preventivi e gestire i propri Pet." },
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

/* ── Cosa succede davvero in pensione (prima/durante/checkout/dopo) ── */
const STAY_LIFECYCLE = [
  {
    icon: FileText,
    title: "Prima dell'arrivo",
    desc: "Prenotazioni, preventivi, caparre, documenti e requisiti sotto controllo.",
  },
  {
    icon: Heart,
    title: "Durante il soggiorno",
    desc: "Alimentazione, farmaci, attività, note, foto e attività dello staff.",
  },
  {
    icon: LogOut,
    title: "Al check-out",
    desc: "Saldo, extra, chiusura soggiorno e storico del cliente.",
  },
  {
    icon: Star,
    title: "Dopo il soggiorno",
    desc: "Recensioni, ri-prenotazioni e clienti da ricontattare.",
  },
];

/* ── Feature organizzate per categoria (non una lista piatta) ── */
const FEATURE_CATEGORIES = [
  {
    icon: Calendar,
    title: "Prenotazioni",
    items: ["Calendario", "Disponibilità", "Preventivi", "Caparre", "Check-in/out"],
  },
  {
    icon: PawPrint,
    title: "Gestione animale",
    items: ["Scheda pet", "Alimentazione", "Farmaci", "Esigenze speciali", "Documenti"],
  },
  {
    icon: ClipboardCheck,
    title: "Operatività",
    items: ["Task", "Staff", "Attività giornaliere", "Note", "Foto", "Aggiornamenti cliente"],
  },
  {
    icon: BarChart3,
    title: "Controllo del business",
    items: ["Incassi", "Occupazione", "Clienti", "Servizi extra", "Statistiche"],
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
      trackDemoRequest();
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
            <Textarea id="demo-message" maxLength={500} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Quanti Pets gestisci? Cosa ti serve?" />
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
  const [config, setConfig] = useState<any>(null);
  const [showNav, setShowNav] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ priceId: string; planName: string } | null>(null);

  useEffect(() => {
    supabase.from("landing_config").select("*").limit(1).single().then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  // Ensure Italian language on this page
  useEffect(() => { i18n.changeLanguage("it"); }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowNav(false);
    const onScroll = () => setShowNav(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleStartTrial = () => navigate("/register-trial");

  const handleSubscribe = (priceId: string, planName: string) => {
    setSelectedPlan({ priceId, planName });
    setPurchaseDialogOpen(true);
  };

  const trialDays = config?.trial_days || 14;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Pet Hotel Manager",
      alternateName: ["Gestionale Pensione Gatti", "Gestionale Pensione Cani", "Software Cat Hotel", "Software Dog Hotel"],
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Pet Hotel Management Software",
      operatingSystem: "Web, iOS, Android",
      url: "https://pethotelmanager.com/landing",
      description: "Gestionale per pensioni di gatti e cani: prenotazioni, schede animali, pagamenti, calendario check-in/out e area clienti in un solo software. Ideale per cat hotel, dog hotel, pensioni feline e canine.",
      featureList: [
        "Gestione prenotazioni pensione gatti e cani",
        "Calendario check-in e check-out",
        "Schede animali con microchip, dieta e note mediche",
        "Preventivi automatici con PDF",
        "Gestione pagamenti e caparre",
        "Occupazione casette in tempo reale",
        "Area riservata per clienti",
        "Statistiche e report",
        "Multi-pensione fino a 10 sedi",
      ],
      screenshot: "https://pethotelmanager.com/assets/screenshots/dashboard.png",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: STRIPE_TIERS.starter.priceYearly,
        highPrice: STRIPE_TIERS.business.priceYearly,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Cos'è un gestionale per pensione gatti?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Un gestionale per pensione gatti è un software che automatizza la gestione delle prenotazioni, dei pagamenti, delle schede animali e del calendario di una pensione felina o cat hotel. Pet Hotel Manager è il gestionale completo per pensioni di gatti, cani e animali in generale.",
          },
        },
        {
          "@type": "Question",
          name: "Funziona anche come gestionale per pensione cani?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sì, Pet Hotel Manager funziona come gestionale per pensione cani, gestionale per pensione gatti e per pensioni miste. Supporta gatti, cani e qualsiasi tipo di animale domestico. È il software ideale per dog hotel, cat hotel e pensioni per animali.",
          },
        },
        {
          "@type": "Question",
          name: "Quanto costa il software per gestione pensione animali?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Il software parte da €${STRIPE_TIERS.starter.priceYearly}/anno per il piano Starter. È disponibile una prova gratuita di ${trialDays} giorni senza carta di credito.`,
          },
        },
        {
          "@type": "Question",
          name: "Posso gestire più pensioni con un solo software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sì, con i piani Pro e Business puoi gestire fino a 10 pensioni per animali da un'unica dashboard. Ogni sede mantiene i propri dati, listini e configurazioni.",
          },
        },
        {
          "@type": "Question",
          name: "Il gestionale funziona su smartphone?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sì, Pet Hotel Manager è un software web ottimizzato per smartphone, tablet e PC. Nessuna app da installare: accedi dal browser ovunque ti trovi.",
          },
        },
      ],
    },
  ];

  return (
    <>
    <div className="min-h-screen bg-background">
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* ── Navbar (appare dopo scroll) ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b transition-transform duration-300 ${showNav ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold text-foreground">Pet Hotel Manager</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#pricing">
              <Button variant="outline" size="sm">Acquista ora</Button>
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Accedi</Button>
            </Link>
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
            La tua pensione.
            <span className="text-primary block mt-1">Finalmente sotto controllo.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            <strong className="text-foreground">Pet Hotel Manager</strong> è il software gestionale creato da chi ha gestito davvero pensioni per animali.
            Prenotazioni, clienti, animali, pagamenti e operatività quotidiana in un unico posto.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Prova gratis per {trialDays} giorni <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#funzionalita">Scopri come funziona</a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Nessuna carta di credito</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Attivo in 2 minuti</span>
            <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> Creato da chi gestisce pensioni</span>
          </div>
        </div>
      </header>

      {/* ══════════ 1bis. NON È SOLO UN CALENDARIO ══════════ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Non è solo un calendario.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Pet Hotel Manager gestisce quello che succede realmente in pensione.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STAY_LIFECYCLE.map((s) => (
              <div key={s.title} className="rounded-xl border bg-background p-6 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="font-semibold text-foreground mb-2">{s.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 1ter. CREATO DA CHI LO FA ══════════ */}
      <section className="py-20 bg-card/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto md:mx-0 shrink-0">
              <PawPrint className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                Lo abbiamo costruito perché ne avevamo bisogno noi per primi.
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                Pet Hotel Manager nasce dall'esperienza diretta nella gestione di due pensioni per gatti a Milano.
                Non abbiamo immaginato come dovrebbe funzionare una pensione. Abbiamo trasformato in software i problemi
                che affrontiamo realmente ogni giorno: prenotazioni, check-in, documenti, pagamenti, organizzazione dello
                staff e cura degli animali.
              </p>
              <Button variant="outline" className="gap-2" onClick={handleStartTrial}>
                Scopri Pet Hotel Manager <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 1quater. OGGI — Preview dashboard ══════════ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Monitor className="h-3.5 w-3.5 mr-1.5" /> La dashboard
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Apri Pet Hotel Manager e sai subito cosa sta succedendo.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Arrivi, partenze, animali presenti, farmaci, task e pagamenti da incassare: tutto in un'unica schermata.
            </p>
          </div>
          <div className="rounded-2xl border shadow-xl overflow-hidden bg-background">
            <img src={screenshotDashboard} alt="Dashboard operativa di Pet Hotel Manager" className="w-full h-auto" loading="lazy" />
          </div>
        </div>
      </section>

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

      {/* ══════════ 3. LA SOLUZIONE — Feature per categoria ══════════ */}
      <section id="funzionalita" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Zap className="h-3.5 w-3.5 mr-1.5" /> La soluzione
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Ecco cosa cambia con Pet Hotel Manager
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tutto quello che ti serve per gestire la pensione, organizzato come lavori davvero.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURE_CATEGORIES.map((cat) => (
              <Card key={cat.title} className="border-none bg-card shadow-md hover:shadow-lg transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <cat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{cat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {cat.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
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
      <section id="pricing" className="py-24 bg-primary/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Scegli il piano più adatto a te
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Annuale */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{STRIPE_TIERS.annuale.name}</CardTitle>
                <Badge variant="secondary" className="w-fit">
                  Risparmi €{STRIPE_TIERS.mensile.priceMonthly * 12 - STRIPE_TIERS.annuale.priceYearly}/anno rispetto al mensile
                </Badge>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.annuale.priceMonthly}</span>
                  <span className="text-muted-foreground">/mese</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pagamento annuale — €{STRIPE_TIERS.annuale.priceYearly}/anno
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" size="lg" onClick={() => handleSubscribe(STRIPE_TIERS.annuale.price_id, "annuale")}>
                  <CreditCard className="h-4 w-4 mr-2" />Acquista ora!
                </Button>
              </CardContent>
            </Card>

            {/* Mensile */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{STRIPE_TIERS.mensile.name}</CardTitle>
                <Badge variant="secondary" className="w-fit">
                  Nessun impegno, sospendilo quando vuoi
                </Badge>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.mensile.priceMonthly}</span>
                  <span className="text-muted-foreground">/mese</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paga solo i mesi che lo usi, i tuoi dati saranno sempre disponibili
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" size="lg" onClick={() => handleSubscribe(STRIPE_TIERS.mensile.price_id, "mensile")}>
                  <CreditCard className="h-4 w-4 mr-2" />Acquista ora!
                </Button>
              </CardContent>
            </Card>
          </div>
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

      {/* ── Sezione SEO keyword ── */}
      <section className="bg-muted/30 border-t py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4 text-center">
            Il software gestionale per ogni tipo di pensione per animali
          </h2>
          <p className="text-muted-foreground text-center mb-8 max-w-3xl mx-auto">
            Pet Hotel Manager è il <strong>gestionale per pensioni di gatti</strong> e <strong>gestionale per pensioni di cani</strong> più completo sul mercato italiano. Progettato per cat hotel, dog hotel, pensioni feline, pensioni canine e pensioni miste.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Gestionale Pensione Gatti</h3>
              <ul className="space-y-1">
                <li>Software per cat hotel</li>
                <li>Gestionale pensione felina</li>
                <li>Programma gestione pensione gatti</li>
                <li>App pensione gatti</li>
                <li>Software cattery</li>
                <li>Gestionale hotel per gatti</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Gestionale Pensione Cani</h3>
              <ul className="space-y-1">
                <li>Software per dog hotel</li>
                <li>Gestionale pensione canina</li>
                <li>Programma gestione pensione cani</li>
                <li>App pensione cani</li>
                <li>Software dog boarding</li>
                <li>Gestionale hotel per cani</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Software Pensione Animali</h3>
              <ul className="space-y-1">
                <li>Gestionale pensione per animali</li>
                <li>Software prenotazioni pensione</li>
                <li>Programma pensione animali domestici</li>
                <li>Pet hotel software Italia</li>
                <li>Gestione prenotazioni pet hotel</li>
                <li>Software multi-pensione animali</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src={landingLogo} alt="Pet Hotel Manager" className="h-8 w-auto object-contain" /> Pet Hotel Manager © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/en" className="hover:text-foreground transition-colors">🇬🇧 English</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/termini" className="hover:text-foreground transition-colors">Termini</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Accedi</Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Prezzi</a>
          </div>
        </div>
      </footer>
    </div>

    {selectedPlan && (
      <PurchaseRequestDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        planName={selectedPlan.planName}
        priceId={selectedPlan.priceId}
      />
    )}
    </>
  );
}
