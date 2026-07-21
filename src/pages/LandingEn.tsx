import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import i18n from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseRequestDialog } from "@/components/PurchaseRequestDialog";
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
  Check, ArrowRight, Shield, Clock, Zap, Building2, Crown, Video, Send,
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
  { src: screenshotDashboard, alt: "Operations dashboard", desc: "Operations dashboard — complete overview of bookings, check-ins/outs and revenue at a glance." },
  { src: screenshotPreventivi, alt: "Quote management", desc: "Quote management — create and send quotes to clients, manage requests from the client portal." },
  { src: screenshotPrenotazioni, alt: "Booking management", desc: "Booking management — full workflow from confirmation to check-out, with quick actions and status filters." },
  { src: screenshotAppuntamenti, alt: "Appointment calendar", desc: "Appointment calendar — schedule check-ins and check-outs with list view and pending bookings." },
  { src: screenshotAppuntamenti2, alt: "Monthly calendar view", desc: "Monthly calendar view — all check-in and check-out appointments at a glance." },
  { src: screenshotOccupazione, alt: "Kennel occupancy", desc: "Kennel occupancy — visual grid with daily occupancy for single and double kennels, by pet type." },
  { src: screenshotCheckin, alt: "Detailed check-in", desc: "Check-in — pet admission with stay summary, payments and transactions for each booking." },
  { src: screenshotRegistro, alt: "Pet registry", desc: "Pet registry — track arrivals and departures with microchip, breed, gender and presence status." },
  { src: screenshotAreaCliente, alt: "Client portal", desc: "Client portal — your clients can view bookings, request quotes and manage their pets." },
  { src: screenshotAreaCliente2, alt: "Client quotes", desc: "Client portal — case details with payment status, quote downloads and boarding forms." },
];

const STARTER_FEATURES = [
  "Quote creation",
  "Booking management",
  "PDF documents",
  "Appointment calendar",
  "Client registry",
  "Attendance log",
  "Kennel occupancy",
  "Reports & statistics",
  "Client portal",
];

const BENEFITS = [
  {
    icon: Calendar,
    title: "Zero overbooking",
    desc: "The real-time calendar shows available kennels instantly. No more double bookings or disappointed clients.",
    before: "Manual checks on spreadsheets, frequent errors",
  },
  {
    icon: Clock,
    title: "Save 10+ hours a week",
    desc: "Automated quotes, PDF-ready in one click, guided check-in/out. Repetitive manual work disappears.",
    before: "Hours wasted filling forms, writing emails, calculating prices",
  },
  {
    icon: CreditCard,
    title: "Payments always under control",
    desc: "Deposits, balances, refunds: everything tracked. You always know who paid, how much and when.",
    before: "Post-its, mental reminders, forgotten deposits",
  },
  {
    icon: PawPrint,
    title: "Complete pet profiles",
    desc: "Microchip, diet, allergies, behavioural notes: everything at hand when you really need it.",
    before: "Information scattered on paper, WhatsApp, loose sheets",
  },
  {
    icon: BarChart3,
    title: "Data-driven decisions",
    desc: "Statistics on occupancy, revenue and trends to understand how to grow your pet boarding business.",
    before: "No visibility on revenue, peak periods, trends",
  },
  {
    icon: Building2,
    title: "Multi-location? No problem",
    desc: "Manage multiple pet hotels from a single dashboard, each with its own data, pricing and settings.",
    before: "Separate spreadsheets for each location, no overall view",
  },
];

const PAIN_POINTS = [
  { icon: X, text: "Bookings on paper, Excel or WhatsApp" },
  { icon: X, text: "Overbooking and double-booked kennels" },
  { icon: X, text: "Hours lost making quotes by hand" },
  { icon: X, text: "Untracked payments, forgotten deposits" },
  { icon: X, text: "No overall picture of your pet hotel" },
];

/* ── Demo Form ── */
function DemoRequestForm() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", pensione_name: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
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
      toast.success("Request sent! We'll get back to you shortly.");
    } catch {
      toast.error("Error sending request. Please try again.");
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
          <h3 className="text-xl font-semibold text-foreground">Request Sent!</h3>
          <p className="text-muted-foreground">We'll contact you shortly to schedule the demo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Book your free demo</CardTitle>
        <CardDescription>We'll get back to you within 24h — no commitment</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-name">Full Name *</Label>
            <Input id="demo-name" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-email">Email *</Label>
            <Input id="demo-email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-phone">Phone</Label>
            <Input id="demo-phone" type="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-pensione">Your Pet Hotel Name</Label>
            <Input id="demo-pensione" maxLength={100} value={form.pensione_name} onChange={(e) => setForm({ ...form, pensione_name: e.target.value })} placeholder="Happy Paws Hotel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-message">Message</Label>
            <Textarea id="demo-message" maxLength={500} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How many pets do you manage? What do you need?" />
          </div>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Request Free Demo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


/* ══════════════ LANDING PAGE (EN) ══════════════ */
export default function LandingEn() {
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

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowNav(false);
    const onScroll = () => setShowNav(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Set language to English and persist it
  useEffect(() => {
    i18n.changeLanguage("en");
  }, []);

  // Update page meta for SEO
  useEffect(() => {
    const prevTitle = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const prevLang = document.documentElement.lang;

    document.title = "Cat & Dog Boarding Software | Pet Hotel Management System | Pet Hotel Manager";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "The complete cat boarding and dog boarding management software: bookings, pet profiles, payments, check-in/out calendar and client portal in one system. Free 14-day trial, no credit card required."
    );
    document.documentElement.lang = "en";

    return () => {
      document.title = prevTitle;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      document.documentElement.lang = prevLang;
    };
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
      alternateName: ["Cat Boarding Software", "Dog Boarding Software", "Cat Hotel Management System", "Dog Hotel Software", "Pet Boarding Management Software"],
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Pet Hotel Management Software",
      operatingSystem: "Web, iOS, Android",
      url: "https://pethotelmanager.com/en",
      description: "Complete cat and dog boarding management software: bookings, pet profiles, payments, check-in/out calendar and client portal in one system. Ideal for cat hotels, dog hotels, catteries and pet boarding businesses.",
      featureList: [
        "Cat and dog boarding booking management",
        "Check-in and check-out calendar",
        "Pet profiles with microchip, diet and medical notes",
        "Automated quotes with PDF",
        "Payment and deposit management",
        "Real-time kennel occupancy",
        "Client self-service portal",
        "Statistics and reports",
        "Multi-location up to 10 sites",
      ],
      screenshot: "https://pethotelmanager.com/assets/screenshots/dashboard.png",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: STRIPE_TIERS.starter.priceYearly,
        highPrice: STRIPE_TIERS.multi.priceYearly,
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "38",
        bestRating: "5",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is cat boarding software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cat boarding software is a management system that automates bookings, payments, pet profiles and calendar management for a cattery or cat hotel. Pet Hotel Manager is the complete solution for cat boarding, dog boarding and all types of pet accommodation businesses.",
          },
        },
        {
          "@type": "Question",
          name: "Does it work for dog boarding as well?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Pet Hotel Manager works as dog boarding software, cat boarding software and for mixed pet hotels. It supports cats, dogs and any type of pet. It is the ideal software for dog hotels, cat hotels and general pet boarding facilities.",
          },
        },
        {
          "@type": "Question",
          name: "How much does pet boarding management software cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `The software starts from €${STRIPE_TIERS.starter.priceYearly}/year for the Single Hotel plan. A free ${trialDays}-day trial is available with no credit card required.`,
          },
        },
        {
          "@type": "Question",
          name: "Can I manage multiple locations with one software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, with the Pro and Business plans you can manage up to 10 pet boarding locations from a single dashboard. Each location keeps its own data, pricing and settings.",
          },
        },
        {
          "@type": "Question",
          name: "Does it work on mobile devices?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Pet Hotel Manager is a web-based software optimised for smartphones, tablets and PCs. No app to install — access it from any browser wherever you are.",
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

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b transition-transform duration-300 ${showNav ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold text-foreground">Pet Hotel Manager</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#pricing">
              <Button variant="outline" size="sm">Buy Now</Button>
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════ 1. HERO ══════════ */}
      <header className="relative min-h-screen flex flex-col items-center justify-start pt-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="relative flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
          <img
            src={landingLogo}
            alt="Pet Hotel Manager - Cat and dog boarding management software"
            className="w-[280px] md:w-[380px] lg:w-[440px] h-auto object-contain drop-shadow-xl"
          />

          <Badge className="mt-6 mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-sm px-4 py-1.5">
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Free {trialDays}-day trial — no credit card required
          </Badge>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-4">
            Manage your pet boarding business
            <span className="text-primary block mt-1">in one single software</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            No more spreadsheets, sticky notes and WhatsApp chaos.
            <strong className="text-foreground"> Pet Hotel Manager</strong> automates bookings, payments and communications
            — saving you <strong className="text-foreground">hours every week</strong> with zero missed reservations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Try Free — {trialDays} Days <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Video className="h-4 w-4" /> Request a Live Demo</a>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Up and running in 2 minutes</span>
            <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> Used by pet hotels worldwide</span>
          </div>
        </div>
      </header>

      {/* ══════════ 2. THE PROBLEM ══════════ */}
      <section className="py-20 bg-destructive/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> The problem
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Running a pet hotel without software is a nightmare
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              If you recognise any of these problems, you're losing time and money every single day.
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

      {/* ══════════ 3. THE SOLUTION — Benefits ══════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Zap className="h-3.5 w-3.5 mr-1.5" /> The solution
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Here's what changes with Pet Hotel Manager
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We don't list features. We show you the <strong className="text-foreground">real results</strong> you get.
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
                    <span className="text-xs font-medium text-destructive/70 bg-destructive/5 px-2 py-1 rounded">Before:</span>
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
              <Monitor className="h-3.5 w-3.5 mr-1.5" /> Explore the interface
            </Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              A look at the software
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Here's how Pet Hotel Manager looks in everyday use.
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
                      <img src={s.src} alt={s.alt} className="w-full h-auto" loading="lazy" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4 max-w-xl mx-auto">{s.desc}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 md:-left-6" />
            <CarouselNext className="-right-4 md:-right-6" />
          </Carousel>
        </div>
      </section>

      {/* ══════════ 4. NUMBERS ══════════ */}
      <section className="py-20 bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">48</div>
              <div className="text-muted-foreground text-sm mt-1">Active pet hotels</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">8,300</div>
              <div className="text-muted-foreground text-sm mt-1">Bookings managed</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">4.9★</div>
              <div className="text-muted-foreground text-sm mt-1">Average rating</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-background border">
              <div className="text-3xl md:text-4xl font-bold text-primary">10h+</div>
              <div className="text-muted-foreground text-sm mt-1">Saved per week</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ 5. MID CTA ══════════ */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            Ready to say goodbye to the chaos?
          </h2>
          <p className="text-muted-foreground text-lg mb-6">
            Start your free {trialDays}-day trial. No card, no commitment, cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Create your free account <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Phone className="h-4 w-4" /> Talk to us</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════ 6. PRICING ══════════ */}
      <section id="pricing" className="py-24 bg-primary/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              One price with all features
            </h2>
          </div>
          <div className="max-w-md mx-auto">
            {/* Single Hotel */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.starter.priceMonthly}</span>
                  <span className="text-muted-foreground">/month</span>
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
                <Button className="w-full" variant="outline" size="lg" onClick={() => handleSubscribe(STRIPE_TIERS.starter.price_id, "starter")}>
                  <CreditCard className="h-4 w-4 mr-2" />Buy now!
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ══════════ 7. DEMO FORM ══════════ */}
      <section id="demo" className="py-24 bg-card/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                <Video className="h-3.5 w-3.5 mr-1.5" /> Free live demo
              </Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                See Pet Hotel Manager in action
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Book a free 30-minute live demo. We'll show you everything and answer all your questions.
              </p>
              <ul className="space-y-3">
                {[
                  "Complete walkthrough tailored to your business",
                  "Live Q&A with our team",
                  "Setup assistance included",
                  "No pressure, no commitment",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* ══════════ 8. FINAL CTA ══════════ */}
      <section className="py-24 bg-primary/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Start your free trial today
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Every day without a management system is a day of extra work, lost bookings and unsatisfied clients.
            <strong className="text-foreground"> Start today — it's free.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-10 py-6 gap-2 shadow-lg shadow-primary/20" onClick={handleStartTrial}>
              Try Free — {trialDays} Days <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Video className="h-4 w-4" /> Request Demo</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card • Up in 2 minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* ── SEO keyword section ── */}
      <section className="bg-muted/30 border-t py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4 text-center">
            The management software for every type of pet boarding business
          </h2>
          <p className="text-muted-foreground text-center mb-8 max-w-3xl mx-auto">
            Pet Hotel Manager is the most complete <strong>cat boarding software</strong> and <strong>dog boarding software</strong> on the market. Designed for cat hotels, dog hotels, catteries, kennels and mixed pet boarding facilities.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Cat Boarding Software</h3>
              <ul className="space-y-1">
                <li>Cat hotel management system</li>
                <li>Cattery management software</li>
                <li>Cat boarding booking system</li>
                <li>Cat kennel software</li>
                <li>Cat hotel software</li>
                <li>Cat boarding app</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Dog Boarding Software</h3>
              <ul className="space-y-1">
                <li>Dog hotel management system</li>
                <li>Kennel management software</li>
                <li>Dog boarding booking system</li>
                <li>Dog kennel software</li>
                <li>Dog hotel software</li>
                <li>Dog boarding app</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Pet Boarding Management</h3>
              <ul className="space-y-1">
                <li>Pet hotel management software</li>
                <li>Pet boarding reservation system</li>
                <li>Pet kennel management system</li>
                <li>Pet hotel software</li>
                <li>Multi-location pet boarding software</li>
                <li>Pet accommodation management</li>
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
            <Link to="/landing" className="hover:text-foreground transition-colors">🇮🇹 Italiano</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/termini" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
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
