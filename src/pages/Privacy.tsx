import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import landingLogo from "@/assets/pethotelmanager_landing_logo.png";

export default function Privacy() {
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
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Informativa sulla Privacy</h1>
        <p className="text-muted-foreground text-sm mb-8">Ultimo aggiornamento: 13 marzo 2026</p>

        <p>
          La presente informativa descrive le modalità di trattamento dei dati personali degli utenti che utilizzano
          il servizio <strong>Pet Hotel Manager</strong> (di seguito "Servizio"), in conformità al{" "}
          <strong>Regolamento (UE) 2016/679</strong> (GDPR) e al <strong>D.Lgs. 196/2003</strong> (Codice Privacy italiano),
          come modificato dal <strong>D.Lgs. 101/2018</strong>.
        </p>

        <h2>1. Titolare del Trattamento</h2>
        <p>
          Il Titolare del trattamento dei dati è <strong>Pet Hotel Manager</strong>.
          Per qualsiasi richiesta relativa al trattamento dei dati personali è possibile scrivere a:{" "}
          <a href="mailto:privacy@pethotelmanager.it" className="text-primary">privacy@pethotelmanager.it</a>.
        </p>

        <h2>2. Dati raccolti</h2>
        <p>Il Servizio raccoglie le seguenti categorie di dati personali:</p>
        <ul>
          <li><strong>Dati identificativi:</strong> nome, cognome, indirizzo email, numero di telefono, indirizzo.</li>
          <li><strong>Dati di accesso:</strong> credenziali di autenticazione (email e password criptata).</li>
          <li><strong>Dati aziendali:</strong> nome della pensione, Partita IVA, PEC, IBAN (per i titolari di pensione).</li>
          <li><strong>Dati relativi agli animali:</strong> nome, razza, microchip, note mediche e comportamentali.</li>
          <li><strong>Dati di navigazione:</strong> indirizzo IP, tipo di browser, pagine visitate, timestamp di accesso.</li>
          <li><strong>Dati di pagamento:</strong> gestiti tramite Stripe Inc. in qualità di responsabile esterno del trattamento. Pet Hotel Manager non memorizza dati di carte di credito.</li>
        </ul>

        <h2>3. Finalità e base giuridica del trattamento</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Finalità</th>
              <th className="text-left">Base giuridica (Art. 6 GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Erogazione del Servizio e gestione dell'account</td>
              <td>Esecuzione del contratto (Art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Gestione dei pagamenti e fatturazione</td>
              <td>Esecuzione del contratto e obbligo legale (Art. 6.1.b, 6.1.c)</td>
            </tr>
            <tr>
              <td>Invio di comunicazioni di servizio</td>
              <td>Esecuzione del contratto (Art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Comunicazioni promozionali</td>
              <td>Consenso dell'interessato (Art. 6.1.a)</td>
            </tr>
            <tr>
              <td>Miglioramento del Servizio e analisi statistiche</td>
              <td>Legittimo interesse (Art. 6.1.f)</td>
            </tr>
            <tr>
              <td>Adempimento di obblighi di legge</td>
              <td>Obbligo legale (Art. 6.1.c)</td>
            </tr>
          </tbody>
        </table>

        <h2>4. Periodo di conservazione</h2>
        <p>I dati personali sono conservati per il tempo strettamente necessario alle finalità per cui sono stati raccolti:</p>
        <ul>
          <li><strong>Dati dell'account:</strong> fino alla cancellazione dell'account da parte dell'utente.</li>
          <li><strong>Dati contabili e fiscali:</strong> 10 anni dalla data dell'ultima transazione (art. 2220 c.c.).</li>
          <li><strong>Dati di navigazione:</strong> massimo 24 mesi.</li>
          <li><strong>Dati di prova gratuita:</strong> eliminati entro 90 giorni dalla scadenza del trial se non convertito.</li>
        </ul>

        <h2>5. Destinatari dei dati</h2>
        <p>I dati possono essere comunicati a:</p>
        <ul>
          <li><strong>Stripe Inc.</strong> — elaborazione pagamenti (certificato PCI-DSS Level 1).</li>
          <li><strong>Provider di hosting e infrastruttura</strong> — con server situati nell'Unione Europea o in Paesi che garantiscono un livello adeguato di protezione (Art. 45 GDPR).</li>
          <li><strong>Autorità competenti</strong> — in caso di obblighi di legge.</li>
        </ul>
        <p>I dati <strong>non vengono venduti</strong> a terzi per finalità commerciali.</p>

        <h2>6. Trasferimenti extra-UE</h2>
        <p>
          Qualora i dati siano trasferiti verso Paesi terzi, il trasferimento avviene sulla base di{" "}
          <strong>decisioni di adeguatezza</strong> della Commissione Europea (Art. 45 GDPR) oppure di{" "}
          <strong>Clausole Contrattuali Standard</strong> (Art. 46.2.c GDPR).
        </p>

        <h2>7. Diritti dell'interessato</h2>
        <p>
          Ai sensi degli articoli 15-22 del GDPR, l'utente ha diritto di:
        </p>
        <ul>
          <li><strong>Accesso</strong> — ottenere conferma dell'esistenza di dati personali e accedere al loro contenuto (Art. 15).</li>
          <li><strong>Rettifica</strong> — correggere dati inesatti o incompleti (Art. 16).</li>
          <li><strong>Cancellazione</strong> — richiedere la cancellazione dei propri dati ("diritto all'oblio", Art. 17).</li>
          <li><strong>Limitazione</strong> — limitare il trattamento in determinati casi (Art. 18).</li>
          <li><strong>Portabilità</strong> — ricevere i propri dati in un formato strutturato e leggibile da dispositivo automatico (Art. 20).</li>
          <li><strong>Opposizione</strong> — opporsi al trattamento basato su legittimo interesse (Art. 21).</li>
          <li><strong>Revoca del consenso</strong> — revocare il consenso prestato in qualsiasi momento (Art. 7.3).</li>
        </ul>
        <p>
          Per esercitare i propri diritti, scrivere a:{" "}
          <a href="mailto:privacy@pethotelmanager.it" className="text-primary">privacy@pethotelmanager.it</a>.
        </p>
        <p>
          L'utente ha inoltre il diritto di proporre reclamo al <strong>Garante per la Protezione dei Dati Personali</strong>{" "}
          (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary">www.garanteprivacy.it</a>).
        </p>

        <h2>8. Cookie</h2>
        <p>
          Il Servizio utilizza esclusivamente <strong>cookie tecnici</strong> necessari al funzionamento della piattaforma
          (autenticazione e sessione). Non vengono utilizzati cookie di profilazione o di terze parti per finalità
          pubblicitarie. In conformità all'Art. 122 del Codice Privacy e alle Linee Guida del Garante sui cookie (2021),
          i cookie tecnici non richiedono il consenso dell'utente.
        </p>

        <h2>9. Sicurezza</h2>
        <p>
          Pet Hotel Manager adotta misure tecniche e organizzative adeguate a garantire la sicurezza dei dati (Art. 32 GDPR),
          tra cui: crittografia dei dati in transito (TLS) e a riposo, accesso basato su ruoli (RBAC), isolamento dei dati
          per tenant e backup regolari.
        </p>

        <h2>10. Modifiche all'informativa</h2>
        <p>
          Il Titolare si riserva il diritto di modificare la presente informativa in qualsiasi momento. Le modifiche
          saranno comunicate tramite il Servizio o via email. L'utilizzo continuato del Servizio dopo la notifica delle
          modifiche costituisce accettazione delle stesse.
        </p>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          Pet Hotel Manager © {new Date().getFullYear()} —{" "}
          <Link to="/termini" className="hover:text-foreground transition-colors">Termini di utilizzo</Link>
        </div>
      </footer>
    </div>
  );
}
