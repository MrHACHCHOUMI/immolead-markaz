import type { Expense, ExpenseCategory } from "@/lib/types/database";

export type ExpenseKind =
  | ExpenseCategory
  | "loyer"
  | "charges_bureau"
  | "salaires"
  | "assurance"
  | "evenement"
  | "juridique"
  | "banque"
  | "entretien"
  | "telephone"
  | "formation"
  | "site_web"
  | "restauration";

export type ExpenseGroup = "marketing" | "equipe" | "agence" | "terrain" | "autre";

export const NATIVE_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "meta_ads",
  "google_ads",
  "production_video",
  "shooting",
  "influenceur",
  "impression",
  "deplacement",
  "commercial",
  "centre_appel",
  "logiciel",
  "autre",
];

export const EXPENSE_KIND_LABELS: Record<ExpenseKind, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  production_video: "Production vidéo",
  shooting: "Shooting photo",
  influenceur: "Influenceur",
  impression: "Flyers / impression",
  deplacement: "Déplacement / carburant",
  commercial: "Prime commerciale",
  centre_appel: "CRC / centre d’appel",
  logiciel: "CRM / logiciels",
  autre: "Autre charge",
  loyer: "Loyer agence",
  charges_bureau: "Électricité / internet",
  salaires: "Salaires",
  assurance: "Assurance",
  evenement: "Salon / événement",
  juridique: "Juridique / notaire",
  banque: "Frais bancaires",
  entretien: "Entretien / ménage",
  telephone: "Téléphone",
  formation: "Formation",
  site_web: "Site web / landing",
  restauration: "Repas clients / équipe",
};

export const EXPENSE_GROUP_LABELS: Record<ExpenseGroup, string> = {
  marketing: "Marketing",
  equipe: "Équipe",
  agence: "Agence",
  terrain: "Terrain",
  autre: "Autre",
};

export const EXPENSE_KIND_META: Record<
  ExpenseKind,
  { group: ExpenseGroup; hint: string }
> = {
  meta_ads: { group: "marketing", hint: "Facebook, Instagram, leads ads" },
  google_ads: { group: "marketing", hint: "Search, Display, YouTube" },
  influenceur: { group: "marketing", hint: "Collabs, stories, reels" },
  production_video: { group: "marketing", hint: "Vidéo projet, drone, motion" },
  shooting: { group: "marketing", hint: "Photos appartements / chantier" },
  impression: { group: "marketing", hint: "Flyers, kakemono, plans" },
  evenement: { group: "marketing", hint: "Salon, portes ouvertes" },
  site_web: { group: "marketing", hint: "Site, landing, hébergement" },
  commercial: { group: "equipe", hint: "Primes, bonus ventes" },
  centre_appel: { group: "equipe", hint: "CRC, qualification leads" },
  salaires: { group: "equipe", hint: "Salaires fixes équipe" },
  formation: { group: "equipe", hint: "Coaching, certifications" },
  loyer: { group: "agence", hint: "Loyer bureau / showroom" },
  charges_bureau: { group: "agence", hint: "Eau, électricité, internet" },
  telephone: { group: "agence", hint: "Forfaits, standard" },
  logiciel: { group: "agence", hint: "CRM, Canva, outils" },
  assurance: { group: "agence", hint: "RC pro, local" },
  banque: { group: "agence", hint: "Frais de compte, TPE" },
  entretien: { group: "agence", hint: "Ménage, maintenance" },
  restauration: { group: "agence", hint: "Repas clients, équipe" },
  deplacement: { group: "terrain", hint: "Carburant, taxis, visites" },
  juridique: { group: "autre", hint: "Avocat, notaire, contrats" },
  autre: { group: "autre", hint: "Charge non classée" },
};

export const EXPENSE_KINDS = Object.keys(EXPENSE_KIND_LABELS) as ExpenseKind[];

const TAG_RE = /^\[\[([a-z_]+)\]\]\s*/;

export function encodeExpenseCategory(kind: ExpenseKind, description: string) {
  if ((NATIVE_EXPENSE_CATEGORIES as string[]).includes(kind)) {
    return { category: kind as ExpenseCategory, description };
  }
  return {
    category: "autre" as ExpenseCategory,
    description: `[[${kind}]] ${description}`.trim(),
  };
}

export function decodeExpenseKind(
  category: string,
  description: string
): { kind: ExpenseKind; description: string } {
  const match = description.match(TAG_RE);
  if (match && match[1] in EXPENSE_KIND_LABELS) {
    return {
      kind: match[1] as ExpenseKind,
      description: description.slice(match[0].length),
    };
  }
  if (category in EXPENSE_KIND_LABELS) {
    return { kind: category as ExpenseKind, description };
  }
  return { kind: "autre", description };
}

export function isNativeExpenseCategory(kind: string): kind is ExpenseCategory {
  return (NATIVE_EXPENSE_CATEGORIES as string[]).includes(kind);
}

export type ExpenseRow = Expense & {
  kind: ExpenseKind;
  display_description: string;
  projects: { id: string; name: string } | null;
};
