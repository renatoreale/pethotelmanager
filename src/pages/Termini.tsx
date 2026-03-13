import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

export default function Termini() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-3">
            <img src={landingLogo} alt="Pet Hotel Manager" className="h-10 w-auto object-contain" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/landing"><ArrowLeft className="h-4 w-4 mr-1" /> Torna alla home</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Termini e Condizioni di Utilizzo</h1>
        <p className="text-muted-foreground text-sm mb-8">Ultimo aggiornamento: 13 marzo 2026</p>

        <p>
          I presenti Termini e Condizioni (di seguito "Termini") regolano l'accesso e l'utilizzo della piattaforma{" "}
          <strong>Pet Hotel Manager</strong> (di seguito "Servizio"), in conformità alla normativa europea e italiana
          applicabile, tra cui la <strong>Direttiva 2011/83/UE</strong> sui diritti dei consumatori,
          il <strong>D.Lgs. 206/2005</strong> (Codice del Consumo) e il <strong>Regolamento (UE) 2016/679</strong> (GDPR).
        </p>

        <h2>1. Definizioni</h2>
        <ul>
          <li><strong>"Fornitore":</strong> Pet Hotel Manager, fornitore del Servizio.</li>
          <li><strong>"Utente":</strong> la persona fisica o giuridica che accede al Servizio.</li>
          <li><strong>"Titolare della Pensione":</strong> l'Utente che sottoscrive un abbonamento per gestire una o più pensioni per animali.</li>
          <li><strong>"Cliente della Pensione":</strong> il soggetto i cui dati vengono gestiti dal Titolare della Pensione tramite il Servizio.</li>
          <li><strong>"Tenant":</strong> lo spazio isolato assegnato a ciascuna pensione all'interno del Servizio.</li>
        </ul>

        <h2>2. Oggetto del contratto</h2>
        <p>
          Il Servizio è una piattaforma SaaS (Software as a Service) per la gestione operativa di pensioni per animali
          domestici (cani e gatti). Include funzionalità di gestione prenotazioni, anagrafica clienti e animali,
          pagamenti, documenti, appuntamenti e reportistica.
        </p>

        <h2>3. Registrazione e account</h2>
        <ul>
          <li>L'accesso al Servizio richiede la creazione di un account con dati veritieri e aggiornati.</li>
          <li>L'Utente è responsabile della riservatezza delle proprie credenziali di accesso.</li>
          <li>Ogni account è strettamente personale e non cedibile a terzi senza autorizzazione scritta.</li>
          <li>Il Fornitore si riserva il diritto di sospendere o eliminare account in caso di violazione dei presenti Termini.</li>
        </ul>

        <h2>4. Prova gratuita</h2>
        <p>
          Il Servizio offre un periodo di prova gratuita la cui durata è indicata nella pagina di registrazione.
          Durante il periodo di prova, l'Utente ha accesso a tutte le funzionalità del piano selezionato.
          Al termine del periodo di prova, l'Utente dovrà sottoscrivere un abbonamento per continuare a utilizzare il Servizio.
          <strong> Non è richiesta alcuna carta di credito</strong> per l'attivazione della prova gratuita.
        </p>

        <h2>5. Piani e pagamenti</h2>
        <ul>
          <li>I prezzi dei piani sono indicati nella pagina di registrazione e nella landing page, espressi in Euro (€) e IVA esclusa ove applicabile.</li>
          <li>Il pagamento avviene tramite <strong>Stripe Inc.</strong>, provider certificato PCI-DSS Level 1.</li>
          <li>L'abbonamento si rinnova automaticamente alla scadenza, salvo disdetta dell'Utente almeno 24 ore prima del rinnovo.</li>
          <li>Il Fornitore si riserva il diritto di modificare i prezzi, comunicando le variazioni con almeno 30 giorni di preavviso.</li>
        </ul>

        <h2>6. Diritto di recesso</h2>
        <p>
          Ai sensi degli artt. 52 e seguenti del <strong>D.Lgs. 206/2005</strong> (Codice del Consumo) e della{" "}
          <strong>Direttiva 2011/83/UE</strong>, l'Utente consumatore ha diritto di recedere dal contratto entro{" "}
          <strong>14 giorni</strong> dalla sottoscrizione dell'abbonamento, senza necessità di specificarne il motivo.
        </p>
        <p>
          Per esercitare il diritto di recesso, l'Utente deve inviare una comunicazione scritta a:{" "}
          <a href="mailto:supporto@pethotelmanager.it" className="text-primary">supporto@pethotelmanager.it</a>.
          Il rimborso verrà effettuato entro 14 giorni dalla ricezione della comunicazione, utilizzando lo stesso
          metodo di pagamento impiegato per la transazione originale.
        </p>

        <h2>7. Obblighi dell'Utente</h2>
        <p>L'Utente si impegna a:</p>
        <ul>
          <li>Utilizzare il Servizio in conformità alla normativa vigente e ai presenti Termini.</li>
          <li>Non utilizzare il Servizio per finalità illecite, fraudolente o lesive dei diritti di terzi.</li>
          <li>Garantire la veridicità e l'aggiornamento dei dati inseriti.</li>
          <li>In qualità di Titolare della Pensione, rispettare gli obblighi previsti dal GDPR in qualità di Titolare del trattamento dei dati dei propri clienti.</li>
          <li>Non tentare di accedere a dati di altri Tenant o di compromettere la sicurezza del Servizio.</li>
        </ul>

        <h2>8. Responsabilità del Titolare della Pensione (GDPR)</h2>
        <p>
          Il Titolare della Pensione, in quanto <strong>Titolare del trattamento</strong> ai sensi dell'Art. 4.7 del GDPR,
          è responsabile del trattamento dei dati personali dei propri clienti inseriti nel Servizio. Pet Hotel Manager
          agisce in qualità di <strong>Responsabile del trattamento</strong> (Art. 28 GDPR), trattando i dati
          esclusivamente secondo le istruzioni documentate del Titolare della Pensione.
        </p>

        <h2>9. Livello di servizio (SLA)</h2>
        <ul>
          <li>Il Fornitore si impegna a garantire una disponibilità del Servizio pari al <strong>99,5%</strong> su base mensile, esclusa la manutenzione programmata.</li>
          <li>La manutenzione programmata sarà comunicata con almeno 48 ore di preavviso.</li>
          <li>Il Fornitore non è responsabile per interruzioni causate da eventi di forza maggiore, malfunzionamenti di terze parti o azioni dell'Utente.</li>
        </ul>

        <h2>10. Proprietà intellettuale</h2>
        <p>
          Tutti i diritti di proprietà intellettuale relativi al Servizio (software, design, marchi, contenuti)
          appartengono al Fornitore. L'Utente non acquisisce alcun diritto di proprietà sul Servizio, ma unicamente
          una licenza d'uso limitata, non esclusiva, non trasferibile e revocabile per la durata dell'abbonamento.
        </p>
        <p>
          I dati inseriti dall'Utente nel Servizio restano di proprietà esclusiva dell'Utente. L'Utente può richiedere
          in qualsiasi momento l'esportazione dei propri dati in formato strutturato (Art. 20 GDPR — diritto alla portabilità).
        </p>

        <h2>11. Limitazione di responsabilità</h2>
        <p>
          Il Fornitore non è responsabile per danni indiretti, incidentali, speciali o consequenziali derivanti
          dall'utilizzo o dall'impossibilità di utilizzo del Servizio, nella misura massima consentita dalla legge applicabile.
          In ogni caso, la responsabilità complessiva del Fornitore non potrà eccedere l'importo pagato dall'Utente
          nei 12 mesi precedenti l'evento che ha dato origine al danno.
        </p>

        <h2>12. Sospensione e risoluzione</h2>
        <ul>
          <li>Il Fornitore può sospendere l'accesso al Servizio in caso di mancato pagamento, violazione dei Termini o utilizzo abusivo.</li>
          <li>L'Utente può recedere dal contratto in qualsiasi momento, con effetto alla scadenza del periodo di abbonamento in corso.</li>
          <li>In caso di risoluzione, i dati dell'Utente saranno conservati per 30 giorni, durante i quali sarà possibile richiederne l'esportazione, dopodiché saranno eliminati definitivamente.</li>
        </ul>

        <h2>13. Modifiche ai Termini</h2>
        <p>
          Il Fornitore si riserva il diritto di modificare i presenti Termini. Le modifiche saranno comunicate con
          almeno <strong>30 giorni di preavviso</strong> tramite email o notifica nel Servizio. L'utilizzo continuato
          del Servizio dopo la data di efficacia delle modifiche costituisce accettazione delle stesse. In caso di
          disaccordo, l'Utente potrà recedere dal contratto senza penali.
        </p>

        <h2>14. Legge applicabile e foro competente</h2>
        <p>
          I presenti Termini sono regolati dalla <strong>legge italiana</strong>. Per qualsiasi controversia relativa
          all'interpretazione o all'esecuzione dei presenti Termini, sarà competente il Foro del luogo di residenza
          o domicilio dell'Utente consumatore, ai sensi dell'Art. 66-bis del Codice del Consumo. Per gli Utenti
          professionali, sarà competente il Foro di Milano.
        </p>
        <p>
          L'Utente consumatore può inoltre ricorrere alla piattaforma europea di risoluzione delle controversie online
          (ODR) disponibile all'indirizzo:{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary">
            https://ec.europa.eu/consumers/odr
          </a>.
        </p>

        <h2>15. Contatti</h2>
        <p>
          Per qualsiasi domanda relativa ai presenti Termini, contattare:{" "}
          <a href="mailto:supporto@pethotelmanager.it" className="text-primary">supporto@pethotelmanager.it</a>.
        </p>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          Pet Hotel Manager © {new Date().getFullYear()} —{" "}
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
