# Piano Google Ads — Pet Hotel Manager

**Account conversioni già attivo:** `AW-18341070139` (vedi `src/lib/gtagConversions.ts` e `index.html`). Azioni di conversione già implementate nel prodotto, da collegare/verificare in Google Ads:
- `trialStart` → conversione primaria (obiettivo principale delle campagne Search)
- `demoRequest` → conversione secondaria/qualificata (valore fisso 1.0 EUR nel codice, da allineare al valore reale attribuito in Google Ads)
- `purchase` → conversione di valore (importo reale + transaction_id), da usare per bidding basato sul valore una volta raccolto volume sufficiente

**Prezzi reali da comunicare (homepage):** piano **Annuale** €25/mese (€300/anno) e piano **Mensile** €35/mese (€420/anno), stesse funzionalità. Trial 14 giorni senza carta di credito, demo live gratuita di 30 minuti. Non citare piani o fasce di prezzo diverse da queste.

---

## 1. Struttura campagne

### Campagna 1 — Search Brand
**Obiettivo:** difendere il nome, costo per clic basso, massimizzare copertura su chi cerca già il brand.
**Keyword (corrispondenza a frase/esatta):** `pet hotel manager`, `pethotelmanager`, `pet hotel manager gestionale`, `pet hotel manager login`, `pet hotel manager prezzo`.
**Budget:** minimo indispensabile (basso CPC atteso), priorità bassa nello split budget (non è acquisizione nuova, è difesa).

### Campagna 2 — Search Generica (alta intenzione, non-branded)
**Obiettivo:** intercettare chi cerca attivamente un gestionale per pensioni.
**Gruppi di annunci per intento:**

| Gruppo | Keyword esempio |
|---|---|
| Gestionale pensione | `gestionale pensione cani`, `gestionale pensione gatti`, `software pensione animali`, `programma gestione pensione cani` |
| Dog/Cat boarding software | `software dog boarding`, `gestionale kennel`, `app gestione pensione animali`, `software pet boarding italia` |
| Problemi operativi (pain-based) | `come evitare overbooking pensione cani`, `programma prenotazioni pensione animali`, `alternativa excel gestione pensione` |
| Apertura nuova attività | `come aprire una pensione per cani software`, `gestionale per chi apre una pensione animali` |

**Corrispondenza:** frase + esatta per le keyword più specifiche; generica a budget contenuto solo per validare nuovi termini, monitorata da vicino.

### Campagna 3 — Performance Max
**Obiettivo:** scalare su Search/Display/YouTube/Discover con gli stessi asset creativi della campagna social (foto stile pubblicitario + i video verticali TikTok/Reels riadattati).
**Asset group per persona** (coerenti con `campagna-strategia.md`):
1. "La Titolare Storica" — pain/prima-dopo, headline su overbooking ed Excel.
2. "Chi Vuole Aprire una Pensione" — headline informative, tono guida/consiglio.
3. "Offerta diretta" — trial 14 giorni, demo live, headline con CTA esplicita.

**Segnali di pubblico (audience signal, non targeting rigido):** visitatori del sito, remarketing list demo/trial, interessi affini a "pet care business", "software gestionale PMI".

### Campagna 4 — Display Remarketing
**Obiettivo:** recuperare chi ha visitato la landing o iniziato il trial senza convertire in acquisto.
**Liste di remarketing:**
- Visitatori landing (tutti, esclusi convertiti) — 30 giorni
- Utenti in trial attivo (giorni 1-14) — messaggio "quanti giorni ti restano"
- Trial scaduto senza acquisto — messaggio "hai ancora dubbi? demo gratuita"

---

## 2. Copy annunci Search (RSA — Responsive Search Ads)

**Pool headline (15, max 30 caratteri ciascuna, Google ne mostra 3 a rotazione):**
1. Gestionale Pensioni Animali
2. Zero Overbooking, Mai Più
3. Calendario Casette in Tempo Reale
4. Prova Gratis 14 Giorni
5. Nessuna Carta di Credito
6. Preventivi PDF in 1 Click
7. Fatto da Chi Gestisce Pensioni
8. Gestionale Pensione Cani e Gatti
9. Basta Excel e Quaderni
10. Attivo in 2 Minuti
11. Demo Live Gratuita 30 Min
12. Da €25/Mese, Tutto Incluso
13. Scheda Animale Sempre a Portata
14. Software Italiano per Pensioni
15. Richiedi la Demo Gratuita

**Pool descrizioni (4, max 90 caratteri ciascuna):**
1. Calendario occupazione casette in tempo reale, zero doppie prenotazioni. Prova gratis 14 giorni.
2. Preventivi, check-in e pagamenti in un unico gestionale pensato per pensioni cani e gatti.
3. Nessuna carta di credito richiesta. Attivo in pochi minuti, assistenza reale non un bot.
4. Richiedi una demo live gratuita di 30 minuti o inizia subito la prova gratuita di 14 giorni.

**Percorso visualizzato (path):** `pethotelmanager.com/prova-gratis` (adattare al path reale della pagina di destinazione scelta).

### Estensioni
- **Sitelink:** "Prova Gratis 14 Giorni" → pagina trial · "Richiedi Demo Live" → sezione demo · "Come Funziona" → pagina funzionalità · "Prezzi" → sezione pricing.
- **Callout:** "Nessuna carta di credito" · "Assistenza reale, non un bot" · "Attivo in 2 minuti" · "Software italiano".
- **Structured snippet (tipo "Funzionalità"):** Preventivi, Calendario prenotazioni, Check-in/Check-out, Registro presenze, Occupazione casette, Report e statistiche.
- **Extension prezzo (se supportata):** Annuale €25/mese · Mensile €35/mese.

## 3. Negative keyword (lista di partenza)

`lavoro`, `stipendio`, `offerte lavoro`, `franchising` *(finché non si comunica realmente un'offerta di franchising)*, `gratis` da solo senza contesto software *(evita traffico di chi cerca pensioni gratuite per animali, non un gestionale)*, `pensione` da sola senza qualificatori software/gestionale *(evita traffico su "pensione cani" generico non commerciale/informativo puro, es. chi cerca dove lasciare il proprio cane, non un software)*, `excel download`, `template excel gratis`.

## 4. Bidding e budget

- **Fase iniziale (poco volume di conversione):** strategia "Massimizza conversioni", conversione target = `trialStart`.
- **Dopo 30+ conversioni/mese per campagna:** passare a "CPA target", tarato sul CAC sostenibile definito nella strategia generale (vedi `campagna-strategia.md`, §7 KPI).
- **Performance Max:** attivare bidding basato sul valore solo dopo aver accumulato dati sufficienti su `purchase` (altrimenti ottimizza su segnali deboli).
- **Split budget indicativo interno a Google Ads** (sul 35%+15% totale assegnato a Google in `campagna-strategia.md`): 50% Search generica, 20% Search brand, 20% Performance Max, 10% Display remarketing.

## 5. Landing page — nota

Le campagne Search/PMax devono puntare a una pagina che riporta *esattamente* i due piani reali (Annuale/Mensile) e il trial di 14 giorni senza carta — mai una pagina con prezzi o piani diversi da quelli mostrati sulla homepage, per coerenza tra annuncio e destinazione (requisito anche di qualità Google Ads, oltre che di correttezza verso l'utente).
