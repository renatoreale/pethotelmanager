import { useTenantConfig } from "@/hooks/usePensioneConfig";

export type PetType = "gatti" | "cani" | "entrambi";

interface PetLabels {
  /** "gatto" / "cane" / "animale" */
  singular: string;
  /** "gatti" / "cani" / "animali" */
  plural: string;
  /** "Gatto" / "Cane" / "Animale" */
  singularCap: string;
  /** "Gatti" / "Cani" / "Animali" */
  pluralCap: string;
  /** "il gatto" / "il cane" / "l'animale" */
  articleSingular: string;
  /** "i gatti" / "i cani" / "gli animali" */
  articlePlural: string;
  /** "del gatto" / "del cane" / "dell'animale" */
  ofSingular: string;
  /** "dei gatti" / "dei cani" / "degli animali" */
  ofPlural: string;
  /** "un gatto" / "un cane" / "un animale" */
  indefiniteSingular: string;
  /** "Anagrafica felini" / "Anagrafica canini" / "Anagrafica animali" */
  registrySubtitle: string;
  /** Dynamic count label: "1 gatto" / "2 gatti" etc. */
  count: (n: number) => string;
  /** "gatt" prefix for dynamic suffixes */
  petType: PetType;
  /** lucide icon name suggestion */
  iconName: "Cat" | "Dog" | "PawPrint";
}

const LABELS: Record<PetType, Omit<PetLabels, "count" | "petType" | "iconName">> = {
  gatti: {
    singular: "gatto",
    plural: "gatti",
    singularCap: "Gatto",
    pluralCap: "Gatti",
    articleSingular: "il gatto",
    articlePlural: "i gatti",
    ofSingular: "del gatto",
    ofPlural: "dei gatti",
    indefiniteSingular: "un gatto",
    registrySubtitle: "Anagrafica felini",
  },
  cani: {
    singular: "cane",
    plural: "cani",
    singularCap: "Cane",
    pluralCap: "Cani",
    articleSingular: "il cane",
    articlePlural: "i cani",
    ofSingular: "del cane",
    ofPlural: "dei cani",
    indefiniteSingular: "un cane",
    registrySubtitle: "Anagrafica canini",
  },
  entrambi: {
    singular: "animale",
    plural: "animali",
    singularCap: "Animale",
    pluralCap: "Animali",
    articleSingular: "l'animale",
    articlePlural: "gli animali",
    ofSingular: "dell'animale",
    ofPlural: "degli animali",
    indefiniteSingular: "un animale",
    registrySubtitle: "Anagrafica animali",
  },
};

const ICON_MAP: Record<PetType, "Cat" | "Dog" | "PawPrint"> = {
  gatti: "Cat",
  cani: "Dog",
  entrambi: "PawPrint",
};

export function getPetLabels(petType: PetType = "gatti"): PetLabels {
  const base = LABELS[petType];
  return {
    ...base,
    petType,
    iconName: ICON_MAP[petType],
    count: (n: number) => `${n} ${n === 1 ? base.singular : base.plural}`,
  };
}

export function usePetLabels(): PetLabels {
  const { data: tenantConfig } = useTenantConfig();
  const petType = (tenantConfig as any)?.pet_type as PetType | undefined;
  return getPetLabels(petType ?? "gatti");
}
