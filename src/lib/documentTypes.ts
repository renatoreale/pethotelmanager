import {
  Syringe, Stethoscope, FileSignature, IdCard, FileText, ShieldCheck, ScrollText,
  type LucideIcon,
} from "lucide-react";

export type DocumentType =
  | "libretto_vaccinazioni"
  | "certificato_sanitario"
  | "modulo_affido"
  | "documento_identita"
  | "privacy"
  | "regolamento"
  | "altro";

export const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: LucideIcon }[] = [
  { value: "libretto_vaccinazioni", label: "Libretto vaccinazioni", icon: Syringe },
  { value: "certificato_sanitario", label: "Certificato sanitario", icon: Stethoscope },
  { value: "modulo_affido", label: "Modulo di affido", icon: FileSignature },
  { value: "documento_identita", label: "Documento d'identità", icon: IdCard },
  { value: "privacy", label: "Informativa privacy", icon: ShieldCheck },
  { value: "regolamento", label: "Regolamento", icon: ScrollText },
  { value: "altro", label: "Altro", icon: FileText },
];

// Documenti del CLIENTE (non di un pet/soggiorno): raccolti una tantum,
// mostrati nella scheda cliente invece che nella scheda pet.
export const CLIENT_DOCUMENT_TYPES: DocumentType[] = ["privacy", "regolamento", "altro"];

// Il testo di questi documenti può cambiare nel tempo: la versione caricata
// va confrontata con la versione "corrente" impostata dal titolare
// (tenants.privacy_version / tenants.regolamento_version) per segnalare i
// clienti che hanno firmato una versione superata.
export const VERSIONED_DOCUMENT_TYPES: DocumentType[] = ["privacy", "regolamento"];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label])
) as Record<DocumentType, string>;

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, LucideIcon> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.icon])
) as Record<DocumentType, LucideIcon>;

// Requisiti minimi richiesti per il soggiorno: se mancano, il checklist li
// segnala come da raccogliere. Gli altri tipi restano caricabili ma non
// sono considerati bloccanti.
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = ["libretto_vaccinazioni", "modulo_affido"];
