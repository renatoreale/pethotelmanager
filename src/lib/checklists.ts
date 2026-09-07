// Checklist standard generate automaticamente al check-in/check-out di una
// prenotazione (Blocco 10). Sono task operative ordinarie — nessuna gating:
// non impediscono di completare il check-in/check-out, servono solo a far
// sì che i passaggi di routine non vengano dimenticati.
export interface ChecklistItem {
  title: string;
  description?: string;
}

export const CHECKIN_CHECKLIST: ChecklistItem[] = [
  { title: "Verifica documenti richiesti", description: "Libretto vaccinazioni, modulo di affido, eventuale certificato sanitario." },
  { title: "Verifica dati anagrafica pet", description: "Microchip, peso, eventuali note mediche o comportamentali." },
  { title: "Foto di arrivo pubblicata in Diario", description: "Una foto del pet all'arrivo, per il diario del soggiorno." },
  { title: "Consegna informativa e regolamento", description: "Il cliente ha ricevuto/firmato la versione attuale del regolamento." },
];

export const CHECKOUT_CHECKLIST: ChecklistItem[] = [
  { title: "Saldo verificato e incassato", description: "Nessun importo residuo aperto sul soggiorno." },
  { title: "Restituzione effetti personali", description: "Guinzagli, ciotole, giochi o coperte portati dal cliente." },
  { title: "Foto di partenza pubblicata in Diario", description: "Una foto del pet alla partenza, per il diario del soggiorno." },
  { title: "Feedback richiesto al cliente", description: "Chiedere un riscontro sul soggiorno appena concluso." },
];
