import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

const TITLE = "Overbooking in pensione per cani e gatti: come evitarlo (guida pratica) | Pet Hotel Manager";
const DESCRIPTION = "Perché succede l'overbooking in una pensione per animali, i 5 errori più comuni che lo causano e la checklist pratica per non farlo mai più.";
const URL = "https://pethotelmanager.com/blog/overbooking-pensione-animali";

export default function OverbookingPensione() {
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
      headline: "Overbooking in pensione per cani e gatti: come evitarlo",
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

        <Badge variant="outline" className="mb-4 border-destructive/30 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Gestione pensione
        </Badge>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight mb-4">
          Overbooking in pensione per cani e gatti: come evitarlo per sempre
        </h1>
        <p className="text-muted-foreground text-sm mb-10">Aggiornato il 6 agosto 2026 · Lettura 6 minuti</p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-lg">
            Una doppia prenotazione sulla stessa casetta non è solo un fastidio organizzativo: è un cliente
            che arriva con il suo cane o il suo gatto e trova il posto già occupato. È uno dei modi più veloci
            per perdere un cliente e guadagnarsi una recensione negativa che resta online per anni. Eppure,
            nella quasi totalità dei casi, l'overbooking in una pensione per animali non è un problema di
            "troppa domanda" — è un problema di processo.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Perché l'overbooking succede così spesso in una pensione
          </h2>
          <p>
            Chi gestisce una pensione per cani o gatti riceve richieste da canali diversi e in momenti diversi:
            una telefonata al mattino, un messaggio WhatsApp la sera, un cliente che si presenta di persona.
            Se non esiste un unico punto dove tutte queste richieste finiscono in tempo reale, prima o poi due
            persone diverse dello staff confermeranno la stessa casetta a due famiglie diverse — o la stessa
            persona la confermerà due volte, in due momenti diversi, senza accorgersene.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            I 5 errori più comuni che portano al doppio inserimento
          </h2>
          <ul className="space-y-3 list-none pl-0">
            {[
              "Un foglio Excel o un quaderno aggiornato da più persone, senza un modo per sapere se qualcun altro lo ha già modificato nel frattempo.",
              "Nessuna vista d'insieme in tempo reale di quali casette sono libere in un dato periodo — bisogna \"andare a memoria\" o scorrere pagine su pagine.",
              "Conferme date via WhatsApp o telefono, ma il calendario \"ufficiale\" viene aggiornato solo più tardi, a fine giornata.",
              "Nessuna distinzione chiara tra una richiesta ancora da confermare e una prenotazione già garantita al cliente.",
              "Cambi last-minute (proroghe, anticipi, cancellazioni) comunicati a voce e non riportati subito ovunque serve.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            La checklist pratica per non farlo mai più
          </h2>
          <div className="space-y-3">
            {[
              "Un solo sistema condiviso e aggiornato in tempo reale da tutto lo staff — non due, non tre versioni diverse della stessa informazione.",
              "Distingui sempre lo stato della prenotazione: richiesta, confermata, check-in effettuato. Solo una prenotazione confermata blocca davvero la casetta.",
              "Tieni una vista giornaliera e mensile dell'occupazione delle casette, così chi risponde al telefono vede subito cosa è davvero disponibile.",
              "Ogni conferma data al cliente (telefono, WhatsApp, di persona) va registrata sul sistema nello stesso momento, non \"più tardi\".",
              "Regola semplice per tutto lo staff: se non è sul sistema, per l'attività non è confermato — nessuna eccezione, nemmeno per un cliente abituale.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 list-none">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </div>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Il costo reale di un overbooking
          </h2>
          <p>
            Non è solo la gestione imbarazzante del momento in cui il cliente arriva e scopre il problema.
            È il cliente che non torna più, è la recensione negativa che i futuri clienti leggono prima di
            scegliere, è il tempo che il titolare o lo staff perdono a cercare una soluzione last-minute
            (un'altra pensione, uno sconto per farsi perdonare, una casetta improvvisata). Un singolo episodio
            può costare più di quanto valgano dieci prenotazioni andate bene.
          </p>

          <h2 className="text-2xl font-serif font-bold text-foreground pt-4">
            Perché un gestionale risolve il problema alla radice
          </h2>
          <p>
            Un foglio Excel o un quaderno non hanno modo di avvisarti che una casetta è già occupata in quelle
            date: sei tu a doverlo verificare, ogni volta, a mente. Un gestionale pensato per pensioni di
            animali invece mostra l'occupazione delle casette in tempo reale — chiunque nello staff, da
            qualunque dispositivo, vede subito cosa è libero e cosa no, prima ancora di confermare una data
            al telefono. Non è più una questione di attenzione o di esperienza: è il sistema stesso a rendere
            impossibile il doppio inserimento.
          </p>

          <div className="mt-10 rounded-xl border-2 border-primary/20 bg-primary/5 p-8 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">
              Zero overbooking, da subito
            </h3>
            <p className="text-muted-foreground mb-5">
              Pet Hotel Manager mostra le casette libere in tempo reale. Prova gratis 14 giorni, nessuna carta di credito richiesta.
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
