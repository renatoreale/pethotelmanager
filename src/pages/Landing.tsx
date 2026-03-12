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
  PawPrint, Calendar, Users, CreditCard, FileText, BarChart3,
  Check, Star, ArrowRight, Shield, Clock, Zap, Building2, Crown, Video, Send } from
"lucide-react";

const BASE_FEATURES = [
"Gestione prenotazioni",
"Calendario appuntamenti",
"Anagrafica clienti e animali",
"Registro presenze",
"1 pensione"];

const PRO_FEATURES = [
"Tutto del piano Base",
"Gestione pagamenti completa",
"Preventivi e documenti PDF",
"Occupazione casette",
"Report e statistiche"];

const GOLD_FEATURES = [
"Tutto del piano Pro",
"Multi-pensione (fino a 3)",
"Dashboard multi-sede",
"Gestione centralizzata"];

const ENTERPRISE_FEATURES = [
"Tutto del piano Gold",
"Pensioni illimitate (oltre 3)",
"Supporto prioritario",
"Configurazione dedicata"];

const SHOWCASE_FEATURES = [
{ icon: Calendar, title: "Prenotazioni Smart", desc: "Gestisci preventivi, conferme, check-in e check-out con un flusso guidato e intuitivo." },
{ icon: PawPrint, title: "Anagrafica Animali", desc: "Schede dettagliate per ogni ospite: microchip, dieta, note comportamentali e veterinarie." },
{ icon: CreditCard, title: "Pagamenti Integrati", desc: "Caparre, saldi, rimborsi e metodi di pagamento personalizzabili per ogni pensione." },
{ icon: FileText, title: "Documenti PDF", desc: "Genera preventivi e moduli di affido professionali con un click." },
{ icon: BarChart3, title: "Occupazione in Tempo Reale", desc: "Visualizza la disponibilità delle casette su griglia giornaliera e pianifica al meglio." },
{ icon: Building2, title: "Multi-Pensione", desc: "Gestisci più sedi da un'unica dashboard con isolamento completo dei dati." }];


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
      const { error } = await supabase.functions.invoke("request-demo", { body: form });
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
        <CardTitle className="text-lg">Prenota la tua demo</CardTitle>
        <CardDescription>Compila il form e ti ricontatteremo entro 24h</CardDescription>
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
            <Textarea id="demo-message" maxLength={500} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Di cosa hai bisogno? Quanti animali gestisci?" />
          </div>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={sending}>
            <Send className="h-4 w-4" /> {sending ? "Invio in corso..." : "Richiedi Demo Gratuita"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    supabase.from("landing_config").select("*").limit(1).single().then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  const handleStartTrial = () => {
    navigate("/register-trial");
  };

  const handleSubscribe = async (priceId: string, planName: string) => {
    setLoadingPlan(planName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/register-trial");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId }
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Errore durante il checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const trialDays = config?.trial_days || 14;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <nav className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Pet Hotel Manager" className="h-10 w-10 rounded-xl object-contain" />
            <span className="font-serif text-xl font-bold text-foreground">Pet Hotel Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo">
              <Button variant="ghost" size="sm">Demo Gratuita</Button>
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Accedi</Button>
            </Link>
            <Button size="sm" onClick={handleStartTrial}>Prova Gratis</Button>
          </div>
        </nav>

        <div className="relative max-w-5xl mx-auto px-6 pt-8 pb-28 text-center">
          <img src="/logo.png" alt="Pet Hotel Manager" className="mx-auto mb-4 h-96 w-auto object-contain" />
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            <Zap className="h-3 w-3 mr-1" /> {trialDays} giorni di prova gratuita
          </Badge>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
{config?.hero_title?.concat("\n") || "Pet Hotel Manager"}
            <span className="text-primary block">pensione per animali</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {config?.hero_description || "Gestisci prenotazioni, pagamenti, clienti e animali in un unico posto. Supporta pensioni per gatti, cani o entrambi."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-8 py-6 gap-2" onClick={handleStartTrial}>
              {config?.cta_text || "Inizia la prova gratuita"} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6" asChild>
              <a href="#pricing">Vedi i piani</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" /> Nessuna carta di credito richiesta
          </p>
        </div>
      </header>

      {/* Features */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un unico strumento per gestire ogni aspetto della tua pensione per animali
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SHOWCASE_FEATURES.map((f) =>
            <Card key={f.title} className="border-none bg-background shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary">50+</div>
              <div className="text-muted-foreground text-sm mt-1">Pensioni attive</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">10.000+</div>
              <div className="text-muted-foreground text-sm mt-1">Prenotazioni gestite</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">4.9★</div>
              <div className="text-muted-foreground text-sm mt-1">Valutazione media</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Piani e Prezzi
            </h2>
            <p className="text-muted-foreground text-lg">
              Scegli il piano più adatto alla tua pensione. Abbonamento annuale o trimestrale.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Base Plan */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Base</CardTitle>
                <CardDescription>Per piccole pensioni</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.base.priceYearly}</span>
                  <span className="text-muted-foreground">/anno</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  equivale a €{(STRIPE_TIERS.base.priceYearly / 12).toFixed(0)}/mese
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  oppure €{(STRIPE_TIERS.base.priceYearly / 4).toFixed(0)}/trimestre
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {BASE_FEATURES.map((f) =>
                  <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  disabled={loadingPlan === "base"}
                  onClick={() => handleSubscribe(STRIPE_TIERS.base.price_id, "base")}>
                  {loadingPlan === "base" ? "Caricamento..." : "Scegli Base"}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-2 border-primary shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Star className="h-3 w-3" /> Consigliato
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Pro</CardTitle>
                <CardDescription>Per pensioni professionali</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.pro.priceYearly}</span>
                  <span className="text-muted-foreground">/anno</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  equivale a €{(STRIPE_TIERS.pro.priceYearly / 12).toFixed(0)}/mese
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  oppure €{(STRIPE_TIERS.pro.priceYearly / 4).toFixed(0)}/trimestre
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {PRO_FEATURES.map((f) =>
                  <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={loadingPlan === "pro"}
                  onClick={() => handleSubscribe(STRIPE_TIERS.pro.price_id, "pro")}>
                  {loadingPlan === "pro" ? "Caricamento..." : "Scegli Pro"}
                </Button>
              </CardContent>
            </Card>

            {/* Gold Plan */}
            <Card className="relative border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-amber-500 text-white gap-1">
                  <Crown className="h-3 w-3" /> Multi-Sede
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Gold</CardTitle>
                <CardDescription>Multi-pensione fino a 3</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.gold.priceYearly}</span>
                  <span className="text-muted-foreground">/anno</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  equivale a €{(STRIPE_TIERS.gold.priceYearly / 12).toFixed(0)}/mese
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  oppure €{(STRIPE_TIERS.gold.priceYearly / 4).toFixed(0)}/trimestre
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {GOLD_FEATURES.map((f) =>
                  <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  size="lg"
                  disabled={loadingPlan === "gold"}
                  onClick={() => handleSubscribe(STRIPE_TIERS.gold.price_id, "gold")}>
                  {loadingPlan === "gold" ? "Caricamento..." : "Scegli Gold"}
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="relative border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-serif">Enterprise</CardTitle>
                <CardDescription>Oltre 3 pensioni</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">€{STRIPE_TIERS.enterprise.priceYearly}</span>
                  <span className="text-muted-foreground">/anno</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  equivale a €{(STRIPE_TIERS.enterprise.priceYearly / 12).toFixed(0)}/mese
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  oppure €{(STRIPE_TIERS.enterprise.priceYearly / 4).toFixed(0)}/trimestre
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {ENTERPRISE_FEATURES.map((f) =>
                  <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  size="lg"
                  disabled={loadingPlan === "enterprise"}
                  onClick={() => handleSubscribe(STRIPE_TIERS.enterprise.price_id, "enterprise")}>
                  {loadingPlan === "enterprise" ? "Caricamento..." : "Scegli Enterprise"}
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Tutti i piani includono {trialDays} giorni di prova gratuita. Nessuna carta di credito richiesta per iniziare.
          </p>
        </div>
      </section>

      {/* Demo Live Request */}
      <section id="demo" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Video className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                Richiedi una Demo Live Gratuita
              </h2>
              <p className="text-muted-foreground text-lg mb-4">
                Vuoi vedere Pet Hotel Manager in azione? Prenota una demo live gratuita con il nostro team.
                Ti mostreremo tutte le funzionalità e risponderemo alle tue domande.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Demo personalizzata di 30 minuti</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Nessun impegno di acquisto</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Risposte a tutte le tue domande</li>
              </ul>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-24 bg-card/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6">
            Pronto a semplificare la gestione?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Registrati ora e prova gratuitamente per {trialDays} giorni. Ti assegneremo una pensione demo
            già configurata con dati di esempio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-base px-10 py-6 gap-2" onClick={handleStartTrial}>
              Inizia ora — è gratis <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 gap-2" asChild>
              <a href="#demo"><Video className="h-4 w-4" /> Richiedi una demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>🐾</span> CatHotel Manager © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Accedi</Link>
            <a href="#pricing" className="hover:text-foreground transition-colors">Prezzi</a>
          </div>
        </div>
      </footer>
    </div>);
}
