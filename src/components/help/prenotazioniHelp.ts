import type { HelpSection } from "@/components/HelpButton";

export const prenotazioniHelpSections: HelpSection[] = [
  {
    title: "Panoramica",
    description:
      "La pagina Prenotazioni mostra tutte le prenotazioni confermate e permette di gestire l'intero workflow operativo: dalla conferma fino alla chiusura della pratica.",
    steps: [
      {
        title: "Elenco prenotazioni",
        description:
          "La tabella elenca tutte le prenotazioni con numero, cliente, animali, tipo casetta, date, stato corrente e importo. Clicca su una riga per espandere il dettaglio.",
      },
      {
        title: "Filtro per stato",
        description:
          "Usa il selettore di stato per filtrare le prenotazioni: Confermata, Appuntamento fissato, In corso, Check-out, Chiusa, Cancellata, ecc.",
      },
      {
        title: "Ricerca rapida",
        description:
          "Digita nella barra di ricerca per trovare prenotazioni per nome cliente o numero prenotazione.",
      },
    ],
  },
  {
    title: "Workflow della prenotazione",
    description:
      "Ogni prenotazione segue un percorso: Confermata → Appuntamento fissato → Check-in → In corso → Check-out → Chiusa.",
    steps: [
      {
        title: "Fissa gli appuntamenti",
        description:
          "Dalla colonna Azioni (menu ⋯), seleziona \"Fissa appuntamento\" per programmare gli slot di check-in e/o check-out nel calendario.",
        tip: "Puoi fissare check-in e check-out separatamente o insieme. Lo stato si aggiornerà di conseguenza (Appt. IN, Appt. OUT, Appt. IN-OUT).",
      },
      {
        title: "Avanzamento di stato",
        description:
          "Il menu Azioni mostra le transizioni disponibili per ogni prenotazione. Clicca sulla transizione desiderata per far avanzare il workflow.",
        tip: "Le transizioni disponibili dipendono dallo stato corrente della prenotazione.",
      },
      {
        title: "Riaprire una prenotazione",
        description:
          "Le prenotazioni confermate possono essere riaperte e modificate con la stessa interfaccia dei preventivi, cliccando sull'icona matita ✏️.",
      },
    ],
  },
  {
    title: "Gestire gli appuntamenti",
    steps: [
      {
        title: "Fissa appuntamento check-in",
        description:
          "Seleziona \"Fissa appuntamento\" dal menu Azioni. Scegli la data e lo slot orario disponibile per il check-in.",
      },
      {
        title: "Fissa appuntamento check-out",
        description:
          "Stesso procedimento per il check-out. Il sistema mostrerà gli slot disponibili per la data di uscita.",
      },
      {
        title: "Modifica date di soggiorno",
        description:
          "Se necessario, puoi modificare le date di check-in o check-out. Il sistema ricalcolerà automaticamente il totale e verificherà la disponibilità delle casette.",
        tip: "Per le prenotazioni \"In corso\", l'anticipo del check-out mantiene il totale originale, mentre il posticipo attiva il ricalcolo.",
      },
    ],
  },
  {
    title: "Pagamenti",
    steps: [
      {
        title: "Visualizza i pagamenti",
        description:
          "Dal menu Azioni, seleziona \"Pagamenti\" per aprire il riepilogo finanziario della prenotazione: totale, pagato, residuo e storico movimenti.",
      },
      {
        title: "Registra un pagamento",
        description:
          "Nella finestra pagamenti, clicca \"Aggiungi pagamento\" per registrare un nuovo incasso (saldo, extra, manuale). Specifica importo, data e metodo.",
        tip: "Puoi registrare anche rimborsi selezionando il tipo \"Rimborso\".",
      },
    ],
  },
  {
    title: "Dettaglio prenotazione",
    steps: [
      {
        title: "Espandi la riga",
        description:
          "Clicca sulla riga della prenotazione per espandere il dettaglio con tutte le informazioni: animali, date, note, storico pagamenti e stato degli appuntamenti.",
      },
      {
        title: "Scarica PDF preventivo",
        description:
          "Dal menu Azioni, seleziona \"Scarica preventivo\" per generare il PDF con il dettaglio della prenotazione.",
      },
      {
        title: "Scarica modulo affido",
        description:
          "Dal menu Azioni, seleziona \"Modulo affido\" per generare il documento di affido da far firmare al cliente al check-in.",
      },
    ],
  },
  {
    title: "Cancellazione e rimborso",
    steps: [
      {
        title: "Cancella una prenotazione",
        description:
          "Dal menu Azioni, seleziona \"Cancella\". Il sistema applicherà la politica di cancellazione configurata, calcolando l'eventuale rimborso in base ai giorni di anticipo.",
        tip: "La politica di cancellazione è configurabile dalla pagina Pensione.",
      },
      {
        title: "Elimina una prenotazione",
        description:
          "Per le prenotazioni cancellate o chiuse, puoi eliminarle definitivamente dal menu Azioni → \"Elimina\".",
        tip: "L'eliminazione è definitiva e non può essere annullata.",
      },
    ],
  },
];
