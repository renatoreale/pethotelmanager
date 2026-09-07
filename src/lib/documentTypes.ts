import { Syringe, Stethoscope, FileSignature, IdCard, FileText, type LucideIcon } from "lucide-react";

export type DocumentType =
  | "libretto_vaccinazioni"
  | "certificato_sanitario"
  | "modulo_affido"
  | "documento_identita"
  | "altro";

export const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: LucideIcon }[] = [
  { value: "libretto_vaccinazioni", label: "Libretto vaccinazioni", icon: Syringe },
  { value: "certificato_sanitario", label: "Certificato sanitario", icon: Stethoscope },
  { value: "modulo_affido", label: "Modulo di affido", icon: FileSignature },
  { value: "documento_identita", label: "Documento d'identità", icon: IdCard },
  { value: "altro", label: "Altro", icon: FileText },
];

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
