import { useTenantConfig } from "@/hooks/usePensioneConfig";

export type PetType = "gatti" | "cani" | "entrambi";

interface PetLabels {
  /** "gatto" / "cane" / "Pet" */
  singular: string;
  /** "gatti" / "cani" / "Pets" */
  plural: string;
  /** "Gatto" / "Cane" / "Pet" */
  singularCap: string;
  /** "Gatti" / "Cani" / "Pets" */
  pluralCap: string;
  /** "il gatto" / "il cane" / "il Pet" */
  articleSingular: string;
  /** "i gatti" / "i cani" / "i Pets" */
  articlePlural: string;
  /** "del gatto" / "del cane" / "del Pet" */
  ofSingular: string;
  /** "dei gatti" / "dei cani" / "dei Pets" */
  ofPlural: string;
  /** "un gatto" / "un cane" / "un Pet" */
  indefiniteSingular: string;
  /** "Anagrafica felini" / "Anagrafica canini" / "Anagrafica Pets" */
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
    singular: "Pet",
    plural: "Pets",
    singularCap: "Pet",
    pluralCap: "Pets",
    articleSingular: "il Pet",
    articlePlural: "i Pets",
    ofSingular: "del Pet",
    ofPlural: "dei Pets",
    indefiniteSingular: "un Pet",
    registrySubtitle: "Anagrafica Pets",
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
