import type { HelpSection } from "@/components/HelpButton";

export const clientiHelpSections: HelpSection[] = [
  {
    title: "📋 Panoramica",
    description:
      "La pagina Clienti è l'anagrafica centrale della struttura. Da qui puoi gestire tutti i dati dei proprietari degli animali, visualizzare i loro pet associati, e gestire l'accesso al portale cliente.",
    steps: [
      {
        title: "Elenco clienti",
        description:
          "Nella tabella trovi tutti i clienti registrati con nome, email, telefono, animali associati, stato del portale e stato generale.",
      },
      {
        title: "Ricerca rapida",
        description:
          "Usa il campo di ricerca in alto per filtrare i clienti per nome, cognome o email.",
        tip: "La ricerca è istantanea: digita e i risultati si aggiornano in tempo reale.",
      },
    ],
  },
  {
    title: "➕ Inserire un nuovo cliente",
    description:
      "Un nuovo cliente può essere inserito sia da questa pagina che durante la creazione di un nuovo preventivo.",
    steps: [
      {
        title: "Vai alla pagina Clienti",
        description:
          'Dal menu laterale, clicca su "Clienti" per aprire l\'anagrafica.',
      },
      {
        title: 'Clicca su "Nuovo Cliente"',
        description:
          "Premi il pulsante blu in alto a destra per aprire il modulo di inserimento.",
      },
      {
        title: "Compila i dati anagrafici",
        description:
          "Inserisci nome, cognome, email, telefono, indirizzo e codice fiscale. Solo nome e cognome sono obbligatori.",
        tip: "L'email è necessaria se vuoi invitare il cliente al portale online.",
      },
      {
        title: "Salva il cliente",
        description:
          'Premi "Salva" per confermare. Il cliente apparirà nella lista.',
      },
    ],
  },
  {
    title: "✏️ Modificare un cliente",
    steps: [
      {
        title: "Trova il cliente nella lista",
        description:
          "Scorri la tabella o usa la barra di ricerca per trovare il cliente.",
      },
      {
        title: "Clicca sull'icona matita",
        description:
          "Nella colonna Azioni del cliente, clicca sull'icona ✏️ per aprire il modulo di modifica.",
      },
      {
        title: "Modifica i dati e salva",
        description:
          "Aggiorna i campi necessari e premi Salva per confermare le modifiche.",
      },
    ],
  },
  {
    title: "🗑️ Eliminare un cliente",
    steps: [
      {
        title: "Clicca sull'icona cestino",
        description:
          "Nella colonna Azioni, clicca sull'icona 🗑️ accanto al cliente da eliminare.",
      },
      {
        title: "Conferma l'eliminazione",
        description:
          'Apparirà una finestra di conferma. Clicca "Elimina" per procedere.',
        tip: "Attenzione: l'eliminazione è irreversibile. Assicurati che il cliente non abbia prenotazioni attive.",
      },
    ],
  },
  {
    title: "📧 Invitare un cliente al portale",
    description:
      "Puoi invitare un cliente ad accedere al portale online per gestire i suoi animali e richiedere preventivi in autonomia.",
    steps: [
      {
        title: "Verifica che il cliente abbia un'email",
        description:
          "L'icona busta ✉️ appare solo per i clienti che hanno un indirizzo email e non hanno ancora un accesso attivo.",
      },
      {
        title: "Clicca sull'icona busta",
        description:
          "Nella colonna Azioni, clicca sull'icona ✉️ per avviare la procedura di invito.",
      },
      {
        title: "Conferma l'invio",
        description:
          'Premi "Crea invito" nella finestra che appare. Verrà generato un link di accesso.',
      },
      {
        title: "Copia e condividi il link",
        description:
          "Copia il link generato e invialo al cliente via email o messaggio. Il cliente lo userà per impostare la sua password.",
        tip: 'Una volta attivato, il badge del cliente cambierà in "Portale attivo".',
      },
    ],
  },
  {
    title: "🚫 Blacklist",
    description:
      "I clienti in blacklist sono evidenziati con un'icona di avvertimento e sfondo rosso.",
    steps: [
      {
        title: "Mettere in blacklist",
        description:
          'Modifica il cliente (icona matita) e attiva l\'opzione "Blacklist". Puoi aggiungere una motivazione.',
      },
      {
        title: "Riconoscere un cliente in blacklist",
        description:
          "Nella lista, i clienti in blacklist hanno un'icona ⚠️ accanto al nome e un badge rosso nella colonna Stato.",
      },
    ],
  },
  {
    title: "🐱 Animali associati",
    description:
      "Nella colonna 'Animali' puoi vedere i nomi dei pet associati a ciascun cliente.",
    steps: [
      {
        title: "Visualizza gli animali",
        description:
          "I nomi degli animali sono elencati direttamente nella tabella clienti.",
      },
      {
        title: "Gestisci gli animali",
        description:
          'Per aggiungere o modificare gli animali, vai alla pagina "Gatti" dal menu laterale.',
      },
    ],
  },
];
