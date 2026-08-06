import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, ClipboardCheck, CheckCircle2, Rocket } from "lucide-react";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

const TITLE = "Come aprire una pensione per cani e gatti: la checklist completa | Pet Hotel Manager";
const DESCRIPTION = "Dalla valutazione del mercato alle autorizzazioni, dallo spazio necessario alla scelta degli strumenti giusti fin da subito: la checklist pratica per aprire una pensione per animali.";
const URL = "https://pethotelmanager.com/blog/aprire-pensione-cani-gatti";

export default function AprirePensione() {
  useEffect(() => {
    const prevTitle = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl?.getAttribute("href") ?? "";

    document.title = TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute("content", DESCRIPTION);
    canonicalEl?.setAttribute("href", URL);

    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Come aprire una pensione per cani e gatti: la checklist completa",
      description: DESCRIPTION,
      url: URL,
      author: { "@type": "Organization", name: "Pet Hotel Manager" },
      publisher: { "@type": "Organization", name: "Pet Hotel Manager" },
      datePublished: "2026-08-06",
      dateModified: "2026-08-06",
      mainEntityOfPage: URL,
    });
    document.head.appendChild(jsonLd);

    return () => {
      document.title = prevTitle;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      canonicalEl?.setAttribute("href", prevCanonical);
      jsonLd.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={landingLogo} alt="Pet Hotel Manager" className="h-9 w-auto object-contain" />
          </Link>
          <Link to="/register-trial">
            <Button size="sm">Prova Gratis <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-14">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Tutti gli articoli
        </Link>

        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Avviare l'attività
        </Badge>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
          Come aprire una pensione per cani e gatti: la checklist completa
        </h1>
        <p className="text-muted-foreground text-sm mb-10">Aggiornato il 6 agosto 2026 · Lettura 8 minuti</p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-lg">
            Aprire una pensione per cani o gatti è spesso una decisione che nasce dalla passione per gli
            animali — ma tra la passione e un'attività che funziona davvero c'è una serie di passaggi
            concreti che è meglio affrontare in ordine, non a mano a mano che i problemi si presentano.
            Ecco una checklist pratica di tutto quello che serve valutare prima e durante l'apertura.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            1. Valuta il mercato prima di firmare qualsiasi contratto
          </h2>
          <p>
            Prima di cercare un locale, capisci chi sono i tuoi potenziali clienti nella zona: quante altre
            pensioni esistono già, che prezzi applicano, che servizi offrono e cosa manca. Un buon indicatore
            è parlare con veterinari e toelettatori della zona — sono spesso i primi a sapere se c'è domanda
            insoddisfatta per posti pensione, soprattutto nei periodi di alta stagione (estate, ponti,
            festività).
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            2. Requisiti legali e autorizzazioni
          </h2>
          <p>
            Le normative per aprire una struttura di ricovero per animali variano da comune a comune e da
            regione a regione in Italia, quindi questa è l'area dove è più importante verificare con le
            autorità locali invece di affidarsi a informazioni generiche trovate online. In linea di massima,
            gli iter da affrontare includono tipicamente:
          </p>
          <ul className="space-y-2 pl-5 list-disc">
            <li>Apertura di partita IVA e scelta della forma giuridica più adatta</li>
            <li>Autorizzazione sanitaria/veterinaria rilasciata dalla ASL competente</li>
            <li>Comunicazioni o autorizzazioni comunali legate alla destinazione d'uso del locale</li>
            <li>Rispetto dei requisiti minimi di spazio, ventilazione e sicurezza per il benessere animale previsti dalla normativa regionale</li>
            <li>Assicurazione di responsabilità civile per danni a terzi e agli animali ospitati</li>
          </ul>
          <p>
            Il consiglio più utile in questa fase: contatta la ASL veterinaria e l'ufficio commercio del tuo
            comune <em>prima</em> di investire in un locale, per sapere esattamente cosa ti verrà richiesto.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            3. Lo spazio: cosa serve davvero
          </h2>
          <ul className="space-y-2 pl-5 list-disc">
            <li>Casette o box in numero e dimensione adeguati, con aree separate per cani e gatti</li>
            <li>Una zona di isolamento/quarantena separata per animali malati o appena arrivati</li>
            <li>Aree sgambamento sicure, con recinzioni verificate e prive di vie di fuga</li>
            <li>Un sistema di riscaldamento/raffrescamento adeguato alle temperature stagionali della zona</li>
            <li>Zone dedicate a pulizia, stoccaggio mangimi e materiali, e un'area di accoglienza per i clienti</li>
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            4. Attrezzatura e forniture iniziali
          </h2>
          <p>
            Cucce, ciotole, guinzagli e materiali di ricambio, prodotti per la pulizia e la sanificazione,
            un kit di primo soccorso per animali, sistemi di identificazione per ogni ospite (collari
            numerati, cartellini sulle casette). Meglio calcolare un margine extra sulle forniture di consumo:
            nei primi mesi è difficile stimare con precisione quanto se ne consuma davvero.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            5. Organizza i processi fin dal primo giorno, non dopo
          </h2>
          <p>
            Uno degli errori più comuni è iniziare con un quaderno o un foglio Excel "tanto siamo piccoli,
            per ora basta questo" — e poi ritrovarsi, qualche mese dopo, a dover migrare tutto lo storico
            clienti e prenotazioni su un sistema più strutturato, nel bel mezzo della stagione di punta.
            Partire fin dall'inizio con un modo chiaro di gestire prenotazioni, preventivi e pagamenti — anche
            se hai pochissimi clienti — ti evita di dover rifare tutto da capo quando l'attività cresce.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            6. I primi clienti: come farsi conoscere
          </h2>
          <ul className="space-y-2 pl-5 list-disc">
            <li>Crea e ottimizza la scheda Google Business Profile — è spesso il primo posto dove chi cerca "pensione per cani/gatti vicino a me" ti trova</li>
            <li>Chiedi attivamente le prime recensioni ai clienti soddisfatti: nella fase iniziale ogni recensione pesa molto di più</li>
            <li>Collabora con veterinari, toelettatori e negozi per animali della zona per il passaparola</li>
            <li>Partecipa a gruppi social locali dedicati agli animali, senza limitarti a pubblicità diretta ma partecipando davvero alla community</li>
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Checklist riassuntiva
          </h2>
          <div className="space-y-3">
            {[
              "Analisi della concorrenza e della domanda locale",
              "Verifica requisiti ASL e comunali prima di firmare il contratto del locale",
              "Spazio adeguato, diviso per specie, con zona di isolamento",
              "Forniture iniziali con margine di sicurezza sui consumi",
              "Un sistema di gestione prenotazioni/preventivi impostato fin dal primo cliente",
              "Scheda Google Business Profile attiva e prime recensioni raccolte",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 list-none">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </div>

          <div className="mt-10 rounded-xl border-2 border-primary/20 bg-primary/5 p-8 text-center">
            <Rocket className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">
              Parti con il piede giusto, fin dal primo cliente
            </h3>
            <p className="text-muted-foreground mb-5">
              Pet Hotel Manager gestisce prenotazioni, preventivi e pagamenti fin dal giorno di apertura. Prova gratis 14 giorni, nessuna carta di credito richiesta.
            </p>
            <Link to="/register-trial">
              <Button size="lg" className="gap-2">
                Prova Gratis — 14 Giorni <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground pt-6">
            Articolo scritto con l'assistenza di strumenti di intelligenza artificiale, rivisto e approvato dal team di Pet Hotel Manager.
            Le informazioni su normative e autorizzazioni sono indicative: verifica sempre i requisiti specifici con la ASL e il comune di competenza.
          </p>
        </div>
      </article>

      <footer className="border-t py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Pet Hotel Manager © {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/termini" className="hover:text-foreground transition-colors">Termini</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
