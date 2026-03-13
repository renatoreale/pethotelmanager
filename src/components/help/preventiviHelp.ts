import type { HelpSection } from "@/components/HelpButton";

export const preventiviHelpSections: HelpSection[] = [
  {
    title: "Panoramica",
    description:
      "La pagina Preventivi permette di creare, gestire e confermare i preventivi per i soggiorni. Da qui puoi anche gestire le richieste di preventivo inviate dai clienti tramite il portale.",
    steps: [
      {
        title: "Elenco preventivi",
        description:
          "La tabella mostra tutti i preventivi attivi con numero, cliente, animali, tipo casetta, date, durata soggiorno, importo totale e caparra prevista.",
      },
      {
        title: "Ricerca rapida",
        description:
          "Usa la barra di ricerca in alto per filtrare i preventivi per nome del cliente o numero preventivo.",
      },
    ],
  },
  {
    title: "Creare un nuovo preventivo",
    steps: [
      {
        title: "Clicca su \"Nuovo Preventivo\"",
        description:
          "Il pulsante si trova in alto a destra nella pagina. Si aprirà il modulo di compilazione.",
      },
      {
        title: "Seleziona il cliente",
        description:
          "Cerca e seleziona il cliente dall'elenco. Se il cliente non esiste, puoi crearlo direttamente dal modulo.",
        tip: "Puoi anche creare un preventivo dalla pagina Clienti.",
      },
      {
        title: "Seleziona gli animali",
        description:
          "Scegli gli animali del cliente che soggiorneranno. Il sistema calcolerà automaticamente il tipo e il numero di casette necessarie.",
      },
      {
        title: "Imposta le date",
        description:
          "Seleziona la data di check-in e check-out. Il sistema calcolerà automaticamente la durata del soggiorno.",
      },
      {
        title: "Verifica il calcolo del prezzo",
        description:
          "Il sistema applica automaticamente i listini stagionali configurati. Puoi verificare il dettaglio dei periodi, gli extra e il totale finale.",
        tip: "Controlla eventuali alert su discrepanze nei giorni o gap nelle date coperte.",
      },
      {
        title: "Salva il preventivo",
        description:
          "Clicca su Salva per creare il preventivo. Verrà assegnato automaticamente un numero progressivo.",
      },
    ],
  },
  {
    title: "Modificare un preventivo",
    steps: [
      {
        title: "Clicca sull'icona matita ✏️",
        description:
          "Nella colonna Azioni della tabella, clicca sull'icona della matita accanto al preventivo da modificare.",
      },
      {
        title: "Modifica i dati",
        description:
          "Puoi modificare cliente, animali, date, note e tutti i parametri del preventivo. Il prezzo verrà ricalcolato automaticamente.",
      },
      {
        title: "Salva le modifiche",
        description:
          "Clicca su Salva per confermare le modifiche apportate.",
      },
    ],
  },
  {
    title: "Confermare un preventivo",
    description:
      "La conferma trasforma il preventivo in una prenotazione confermata e richiede la registrazione della caparra.",
    steps: [
      {
        title: "Clicca sull'icona verde ✓",
        description:
          "Nella colonna Azioni, clicca sull'icona di conferma (segno di spunta verde) accanto al preventivo.",
      },
      {
        title: "Registra la caparra",
        description:
          "Si aprirà un modulo dove dovrai inserire: importo della caparra, data di pagamento, metodo di pagamento e note opzionali.",
        tip: "La caparra è obbligatoria e deve essere maggiore di zero.",
      },
      {
        title: "Conferma",
        description:
          "Clicca su Conferma per completare l'operazione. Il preventivo diventerà una prenotazione confermata visibile nella pagina Prenotazioni.",
      },
    ],
  },
  {
    title: "Scaricare il PDF",
    steps: [
      {
        title: "Clicca sull'icona download 📥",
        description:
          "Nella colonna Azioni, clicca sull'icona blu di download per generare il PDF del preventivo.",
      },
      {
        title: "Contenuto del PDF",
        description:
          "Il PDF include: intestazione con logo e dati della pensione, dettaglio servizi e periodi, totale, modalità di pagamento e blocco di accettazione con firma.",
        tip: "Puoi personalizzare il footer e le modalità di pagamento dalla pagina Configurazione Pensione.",
      },
    ],
  },
  {
    title: "Eliminare un preventivo",
    steps: [
      {
        title: "Clicca sull'icona cestino 🗑️",
        description:
          "Nella colonna Azioni, clicca sull'icona rossa del cestino accanto al preventivo da eliminare.",
      },
      {
        title: "Conferma l'eliminazione",
        description:
          "Verrà mostrata una finestra di conferma. Clicca su Elimina per procedere.",
        tip: "L'eliminazione è definitiva e non può essere annullata.",
      },
    ],
  },
  {
    title: "Richieste preventivo dai clienti",
    description:
      "Se un cliente invia una richiesta dal portale, apparirà un riquadro arancione in alto nella pagina.",
    steps: [
      {
        title: "Prendi in carico la richiesta",
        description:
          "Clicca su \"Prendi in carico\" per accettare la richiesta. I dati del cliente, le date e le note verranno pre-compilati nel modulo di creazione preventivo.",
      },
      {
        title: "Rifiuta una richiesta",
        description:
          "Clicca sull'icona X rossa per rifiutare. Dovrai inserire obbligatoriamente un motivo, che verrà mostrato al cliente nel suo portale.",
        tip: "Il cliente vedrà anche il numero di telefono della pensione per contattarvi direttamente.",
      },
    ],
  },
];
