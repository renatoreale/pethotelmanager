// Generates the 44 non-feature "quote card" images locally (no AI, no external calls).
// Run with: node generate-cards.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("assets");
const W = 1080, H = 1080;
const BG = "#fdf7f0";
const ACCENT = "#c45a12";
const TEXT = "#2b1d12";

function wrapText(text, maxCharsPerLine) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxCharsPerLine) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function makeCard(headline, outPath) {
  const fontSize = headline.length > 90 ? 52 : 64;
  const maxChars = headline.length > 90 ? 26 : 22;
  const lineHeight = fontSize + 12;
  const lines = wrapText(headline, maxChars);
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((l, i) => `<tspan x="${W / 2}" y="${startY + i * lineHeight}">${esc(l)}</tspan>`)
    .join("");

  const svg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <rect x="0" y="0" width="${W}" height="18" fill="${ACCENT}"/>
    <rect x="0" y="${H - 18}" width="${W}" height="18" fill="${ACCENT}"/>
    <text x="${W / 2}" y="${startY}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="bold" fill="${TEXT}" text-anchor="middle">${tspans}</text>
    <text x="${W / 2}" y="${H - 70}" font-family="Arial, sans-serif" font-size="30" fill="${ACCENT}" text-anchor="middle" font-weight="bold">PET HOTEL MANAGER</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

const CARDS = [
  { n: "02", t: "Una doppia prenotazione non succede per caso. Succede perché due persone hanno scritto sullo stesso giorno, in due posti diversi." },
  { n: "03", t: "Se una conferma non è da nessuna parte tranne che in una chat, per l'attività non è confermata." },
  { n: "04", t: "Il momento peggiore per scoprire un errore di calendario: quando il cliente è già arrivato." },
  { n: "05", t: "Rifare i calcoli del preventivo a mano, ogni volta: quante ore ti costa in un mese?" },
  { n: "06", t: "Il weekend è il momento con più check-in e check-out, ed è il più facile in cui perdere il controllo." },
  { n: "07", t: "Un foglio Excel aggiornato da tre persone diverse non è un sistema. È una scommessa." },
  { n: "08", t: "“Aspetti che controllo sul quaderno...” Ogni secondo di attesa è un secondo in più per la concorrenza." },
  { n: "09", t: "Le caparre non tracciate sono soldi già guadagnati sulla carta, ma non ancora in cassa." },
  { n: "10", t: "Una recensione negativa per un errore di calendario resta online per anni." },
  { n: "26", t: "3 segnali che il tuo sistema di prenotazione ti sta facendo perdere clienti." },
  { n: "27", t: "In estate le richieste raddoppiano. È il periodo con più errori di calendario." },
  { n: "28", t: "Prima di aprire una pensione: verifica sempre i requisiti con ASL e comune del tuo territorio." },
  { n: "29", t: "Conosci davvero tutte le voci di costo della tua pensione?" },
  { n: "30", t: "Le prime recensioni contano più di tutte le altre messe insieme." },
  { n: "31", t: "Se non hai ottimizzato la scheda Google Business, stai perdendo chi ti cerca proprio ora." },
  { n: "32", t: "Cani e gatti hanno bisogno di aree separate, non solo di casette diverse." },
  { n: "33", t: "Consiglio: chiedi sempre una coperta o un gioco di casa. Aiuta l'animale ad ambientarsi." },
  { n: "34", t: "Avere sempre a portata di mano il veterinario di riferimento può fare la differenza in un'urgenza." },
  { n: "35", t: "La causa numero uno di errori non è la disattenzione. È la mancanza di un unico posto dove vedere le stesse informazioni." },
  { n: "36", t: "Nato dall'esperienza diretta di creazione e gestione di due pensioni in Lombardia." },
  { n: "37", t: "Creato da chi gestisce pensioni, per chi gestisce pensioni." },
  { n: "38", t: "Non un gestionale generico adattato alla meglio. Pensato da zero per chi lavora con cani e gatti ogni giorno." },
  { n: "39", t: "I dati dei tuoi clienti restano al sicuro. Nessuna carta di credito richiesta per iniziare." },
  { n: "40", t: "Il gestionale pensato per pensioni italiane, non un CRM generico riadattato." },
  { n: "41", t: "14 giorni gratis. Nessuna carta di credito. Attivo in 2 minuti." },
  { n: "42", t: "Prova gratuita di 14 giorni, senza carta di credito. Se non ti convince, non hai perso nulla." },
  { n: "43", t: "Attivo in 2 minuti. Meno del tempo che impiegheresti a cercare un post-it." },
  { n: "44", t: "Da Excel al calendario in tempo reale, in un pomeriggio." },
  { n: "45", t: "Preferisci vederlo prima di provarlo da solo? Richiedi una demo live gratuita." },
  { n: "46", t: "Un piano per ogni dimensione: da una singola pensione fino a 10 sedi gestite insieme." },
  { n: "47", t: "Il link per iniziare è in bio. Ti bastano nome, email e due minuti." },
  { n: "48", t: "Hai ancora dubbi? Chiedici tutto, rispondiamo noi, non un bot." },
  { n: "49", t: "La giornata di chi gestisce una pensione non finisce mai davvero alle 18." },
  { n: "50", t: "Cani e gatti nella stessa struttura: convivenza pacifica o eterna diplomazia?" },
  { n: "51", t: "Qual è l'errore di organizzazione che hai fatto una volta sola, perché non lo hai più rifatto?" },
  { n: "52", t: "Sondaggio: gestisci ancora tutto a mano o sei già passato a un gestionale?" },
  { n: "53", t: "Il vero capo della pensione decide sempre quando entrare in casetta. Il calendario, almeno, sta al passo." },
  { n: "54", t: "Lavorare in team in una pensione richiede di essere sempre allineati. Come organizzate voi i turni?" },
  { n: "55", t: "Aspettativa: giornata tranquilla. Realtà: tre telefonate, un check-in anticipato, un post-it sparito." },
  { n: "56", t: "L'alta stagione arriva sempre più in fretta di quanto sembri organizzata." },
  { n: "57", t: "Le vacanze di Natale sono un altro picco di richieste. Chi prenota per primo sceglie meglio." },
  { n: "58", t: "Ponti e lunghi weekend: piccoli picchi che, senza un sistema chiaro, diventano piccoli caos." },
  { n: "59", t: "Settembre: con le vacanze finite arrivano le richieste per i weekend autunnali." },
  { n: "60", t: "In inverno il riscaldamento conta quanto un calendario senza errori." },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const { n, t } of CARDS) {
    await makeCard(t, path.join(OUT_DIR, `post-${n}.png`));
    console.log(`OK post-${n}.png`);
  }
  console.log(`\nDone. ${CARDS.length} cards generated.`);
}

main();
