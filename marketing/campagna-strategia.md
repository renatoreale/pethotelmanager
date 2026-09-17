# Campagna "Raddoppia la Pensione, non le Ore" — Pet Hotel Manager

**Obiettivo:** +100% vendite (nuovi abbonamenti pagati) su Pet Hotel Manager.
**Mercato:** Italia, lingua italiana. **Dominio:** pethotelmanager.com. **Trial:** 14 giorni gratis, nessuna carta di credito. **Demo:** demo live 30 minuti gratuita.
**Fonte prezzi (reali, da homepage pethotelmanager.com — sezione "Scegli il piano più adatto a te"):** due piani, stesse funzionalità (preventivi, prenotazioni, documenti PDF, calendario, anagrafica clienti, registro presenze, occupazione casette, report e statistiche, area riservata cliente) — **Annuale** €25/mese (€300/anno, pagamento annuale) · **Mensile** €35/mese (€420/anno, nessun impegno, sospendibile quando vuoi). Nessun altro piano è oggi pubblicizzato sulla homepage: la comunicazione della campagna deve restare coerente con questi due soli piani.
**Tracking già attivo (`src/lib/gtagConversions.ts`, account Google Ads AW-18341070139):** conversioni `trialStart`, `demoRequest`, `purchase` — nessun setup nuovo richiesto lato tracking, solo collegare le campagne a queste azioni già esistenti.
**Regola trasversale (eredità dal piano 60 post):** nessuna statistica, recensione o testimonianza inventata. Solo dati/screenshot della pensione demo "La Zampa Felice". Foto in stile pubblicitario pulito e fotorealistico, mai finti loghi di clienti reali.

---

## 1. La matematica del "+100%"

Vendite = (Trial avviati + Demo richieste) × tasso di conversione a pagamento × valore medio del piano.

Raddoppiare le vendite **non significa solo raddoppiare il traffico**. Tre leve, da lavorare insieme:

1. **Più domanda qualificata in ingresso** → scala su Google Search (intenzione alta) + awareness su Meta/TikTok (costruzione di domanda futura).
2. **Migliore conversione trial → pagante** → remarketing mirato durante i 14 giorni di prova (Meta + Display), email/CTA coerenti, nessuna frizione nella richiesta demo.
3. **Valore medio/LTV più alto** → spingere chi si converte verso il piano **Annuale** (risparmio di €120/anno rispetto al Mensile, meno rischio di abbandono/churn) invece del Mensile, a parità di funzionalità.

## 2. Pubblici target (persona)

| Persona | Descrizione | Dolore principale | Piano di riferimento |
|---|---|---|---|
| **La Titolare Storica** | Gestisce da anni 1 pensione, ancora con Excel/quaderno, 35-55 anni | Overbooking, tempo perso, caparre non tracciate | Annuale o Mensile |
| **Chi Vuole Aprire una Pensione** | Sta valutando di aprire un'attività, ricerca informativa | Non sa cosa serve, cerca strumenti prima di partire | Mensile (trial, poi valuta l'annuale) |
| **Il Gruppo Multi-sede** | Gestisce 2+ strutture o punta a espandersi (usa la funzione multi-pensione del prodotto) | Nessuna vista unificata tra sedi | Annuale o Mensile (stessa struttura di prezzo) |
| **Lo Staff Giovane** | Dipendente/collaboratore attivo sui social, influenza la scelta del titolare | Comunicazione interna disorganizzata | Prescrittore interno (non acquirente diretto) |

## 3. Big idea creativa

Il brand nasce da chi ha davvero gestito due pensioni in Lombardia (già raccontato nel Pillar D del piano 60 post) — è la prova di autenticità che sostituisce recensioni/statistiche inventate, che per policy non si usano mai.

**Concept:** *"Fatto da chi ha pulito le casette prima di scrivere una riga di codice."*

**Tagline campagna (3 opzioni, da validare con il team):**
- "Raddoppia la pensione, non le ore." *(consigliata — lega esplicitamente all'obiettivo +100%)*
- "Meno quaderno, più controllo."
- "La pensione che si gestisce da sola. Quasi."

Tono: diretto, pratico, un po' ironico sul caos quotidiano (coerente con i Pillar A/F già scritti), mai sopra le righe o "corporate".

## 4. Allocazione budget per canale (percentuale, da applicare al budget mensile reale)

| Canale | % budget | Ruolo nel funnel |
|---|---|---|
| Google Search | 35% | Intercetta chi cerca già "gestionale pensione cani/gatti", massima intenzione |
| Meta Ads (FB/IG) | 30% | Awareness + retargeting durante il trial (14 giorni) |
| TikTok Ads | 15% | Awareness su pubblico nuovo (staff giovane, nuovi imprenditori), CPM basso |
| Google Performance Max / Display remarketing | 15% | Recupero abbandoni landing/trial, awareness a scala |
| Test creativi/contingency | 5% | Nuovi hook, nuovi formati |

Rivedere lo split ogni 4-6 settimane in base a CPL/CAC reali per canale (vedi §7 KPI).

## 5. Calendario editoriale cross-canale (esempio primi 3 mesi)

- **Mese 1 — Awareness:** pubblicazione piano 60 post FB/IG esistente (Pillar A, C, F) + lancio primi 6 TikTok "dolore/ironia" + Google Search live su keyword branded + generiche.
- **Mese 2 — Consideration:** Pillar B (funzionalità) su FB/IG + TikTok "come funziona in 15 secondi" + Performance Max con asset prodotto + primo remarketing display sui visitatori landing.
- **Mese 3 — Conversion:** Pillar E (offerta/CTA) su tutti i canali in parallelo, push demo live, retargeting Meta sugli utenti in trial agli ultimi giorni, Google Search su keyword "vs Excel" / competitor generiche.

Poi loop mensile: Awareness → Consideration → Conversion, con contenuti freschi ogni mese e riuso ciclico dei pillar dopo 3-4 mesi.

## 6. Canali e piani di dettaglio

- **Facebook/Instagram:** piano già esistente in `marketing/social/piano-60-post.md` (60 post, Pillar A-G). Aggiunta in questa campagna: `marketing/social/piano-reels.md` con script video brevi.
- **TikTok:** nuovo piano in `marketing/social/piano-tiktok.md`.
- **Google Ads:** nuovo piano in `marketing/google-ads/piano-google-ads.md` (Search + Performance Max + Remarketing display).

## 7. KPI e misurazione

| Metrica | Dove si misura | Obiettivo indicativo |
|---|---|---|
| CPL (costo per trial/demo) | Google Ads, Meta Ads Manager, TikTok Ads Manager | Ridurre nel tempo, non solo nel mese 1 |
| Trial → Pagante | Supabase / Stripe (`purchase` conversion già tracciata) | Monitorare per canale con UTM |
| CAC per canale | Spesa canale / nuovi paganti attribuiti | CAC < LTV atteso (min. 12 mesi di abbonamento) |
| Mix piano venduto | Stripe (Annuale vs Mensile) | Aumentare quota Annuale nel tempo (LTV più stabile) |
| ROAS complessivo | Spesa totale vs fatturato nuovo generato | Target: raddoppiare le vendite entro l'orizzonte di budget concordato |

**Nota operativa:** usare parametri UTM coerenti su ogni link (`utm_source`, `utm_medium=cpc|social`, `utm_campaign=raddoppia-2026`) per poter attribuire correttamente trial e vendite per canale — necessario per validare davvero il "+100%".

## 8. Prossimi passi

1. Validare tagline e budget mensile reale con il team.
2. Attivare Google Search su keyword già mappate (vedi piano Google Ads).
3. Pubblicare le prime settimane social (piano 60 post + primi TikTok).
4. Impostare UTM e verificare in Google Ads/Meta Ads Manager che le conversioni esistenti (`trialStart`, `demoRequest`, `purchase`) siano collegate correttamente alle nuove campagne.
