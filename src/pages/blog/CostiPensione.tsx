import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Euro, CheckCircle2, TrendingDown } from "lucide-react";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

const TITLE = "Quanto costa gestire una pensione per cani e gatti: guida ai costi | Pet Hotel Manager";
const DESCRIPTION = "Le voci di costo reali di una pensione per animali — fisse, variabili, personale e costi nascosti — e come ridurle senza abbassare la qualità del servizio.";
const URL = "https://pethotelmanager.com/blog/quanto-costa-gestire-pensione-animali";

export default function CostiPensione() {
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
      headline: "Quanto costa gestire una pensione per cani e gatti: guida ai costi",
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
          <Euro className="h-3.5 w-3.5 mr-1.5" /> Costi e gestione
        </Badge>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
          Quanto costa gestire una pensione per cani e gatti: guida ai costi
        </h1>
        <p className="text-muted-foreground text-sm mb-10">Aggiornato il 6 agosto 2026 · Lettura 7 minuti</p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-lg">
            Chi gestisce (o sta per aprire) una pensione per cani o gatti si trova quasi sempre a fare i conti
            con voci di costo che non aveva previsto in partenza. I costi "ovvi" — affitto, mangime, personale
            — sono solo una parte del quadro. Ecco una mappa completa delle voci di costo reali, comprese
            quelle che quasi nessuno mette nel conto finché non ci sbatte contro.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            I costi fissi: quelli che paghi anche a zero prenotazioni
          </h2>
          <p>
            Sono le spese che restano uguali indipendentemente da quanti animali ospiti in un dato mese:
          </p>
          <ul className="space-y-2 pl-5 list-disc">
            <li>Affitto o mutuo del locale/terreno, incluse eventuali spese condominiali</li>
            <li>Utenze — acqua, elettricità, riscaldamento (spesso più alte del previsto per il riscaldamento invernale delle aree interne)</li>
            <li>Assicurazione RC per danni a terzi e agli animali ospitati</li>
            <li>Licenze, autorizzazioni comunali e sanitarie (ASL), e i relativi rinnovi periodici</li>
            <li>Manutenzione ordinaria di recinzioni, casette, impianti</li>
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            I costi variabili: legati direttamente agli animali ospitati
          </h2>
          <p>
            Crescono (o si riducono) in base a quanti animali hai in un dato periodo:
          </p>
          <ul className="space-y-2 pl-5 list-disc">
            <li>Mangime, lettiere e prodotti per l'igiene — variano molto in base a taglia e numero di animali</li>
            <li>Prodotti di pulizia e sanificazione degli ambienti tra un ospite e l'altro</li>
            <li>Consulti veterinari e, occasionalmente, spese impreviste per urgenze durante il soggiorno</li>
            <li>Materiali di consumo (guinzagli di riserva, ciotole, coperte, giochi)</li>
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Il costo del personale
          </h2>
          <p>
            Anche in una struttura a conduzione familiare, il tempo del titolare ha un costo reale — anche se
            non compare mai su una fattura. Se hai collaboratori, oltre allo stipendio vanno messi in conto
            i turni per coprire weekend e festivi (i giorni di picco per check-in/check-out), le sostituzioni
            per malattia e ferie, e il tempo di formazione di ogni nuova persona.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            I costi nascosti che quasi nessuno mette in conto
          </h2>
          <p>
            Sono quelli che non vedi su nessuna fattura, ma che pesano sul tempo e sui mancati guadagni:
          </p>
          <ul className="space-y-2 pl-5 list-disc">
            <li><strong>Tempo perso nella gestione manuale</strong> — preventivi fatti a mano, calcoli di prezzo rifatti ogni volta, telefonate per verificare disponibilità</li>
            <li><strong>Pagamenti rincorsi</strong> — caparre non tracciate, saldi dimenticati, tempo speso a ricordare ai clienti cosa devono ancora pagare</li>
            <li><strong>Clienti persi per errori evitabili</strong> — un overbooking, una prenotazione persa in mezzo ai messaggi WhatsApp, una risposta arrivata troppo tardi rispetto a un concorrente più reattivo</li>
            <li><strong>Acquisizione di nuovi clienti</strong> — che sia passaparola, social o pubblicità, portare un nuovo cliente ha sempre un costo, diretto o in tempo investito</li>
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Un esempio indicativo (non un dato di mercato)
          </h2>
          <p>
            Ogni pensione ha una struttura di costi diversa in base a dimensione, località e servizi offerti,
            quindi non esiste un numero "medio" affidabile da citare. A titolo puramente illustrativo, un modo
            utile di ragionare è dividere i costi mensili in tre blocchi — fissi, variabili, personale — e
            confrontarli con l'occupazione media delle casette in quel mese: è quel rapporto, non il singolo
            costo isolato, a dirti se il prezzo che applichi oggi è sostenibile o va rivisto.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Come ridurre i costi senza abbassare la qualità
          </h2>
          <div className="space-y-3">
            {[
              "Digitalizza preventivi e calendario: meno tempo perso a mano significa più tempo per gli animali e per i clienti, senza assumere nessuno in più.",
              "Elimina l'overbooking: ogni casetta rimasta vuota per un errore di calendario è un mancato guadagno che si poteva evitare.",
              "Traccia caparre e saldi in automatico, così nessun pagamento resta \"dimenticato\" fino a fine mese.",
              "Guarda l'occupazione delle casette in tempo reale per capire subito dove hai margine per accettare altre prenotazioni.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 list-none">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </div>

          <div className="mt-10 rounded-xl border-2 border-primary/20 bg-primary/5 p-8 text-center">
            <TrendingDown className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">
              Meno tempo perso, meno errori, meno costi nascosti
            </h3>
            <p className="text-muted-foreground mb-5">
              Pet Hotel Manager automatizza prenotazioni, preventivi e pagamenti. Prova gratis 14 giorni, nessuna carta di credito richiesta.
            </p>
            <Link to="/register-trial">
              <Button size="lg" className="gap-2">
                Prova Gratis — 14 Giorni <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground pt-6">
            Articolo scritto con l'assistenza di strumenti di intelligenza artificiale, rivisto e approvato dal team di Pet Hotel Manager.
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
