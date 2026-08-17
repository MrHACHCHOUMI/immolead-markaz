import type {
  AppointmentStatus,
  InterestLevel,
  LeadSource,
  LeadStatus,
  ProjectStatus,
  UnitStatus,
} from "@/lib/types/database";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  actif: "Actif",
  en_pause: "En pause",
  termine: "Terminé",
  archive: "Archivé",
};

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  disponible: "Disponible",
  option: "Option",
  reserve: "Réservé",
  vendu: "Vendu",
  bloque: "Bloqué",
};

export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  disponible: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  option: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  reserve: "bg-sky-500/15 text-sky-300 ring-sky-400/20",
  vendu: "bg-white/10 text-white/70 ring-white/15",
  bloque: "bg-rose-500/15 text-rose-300 ring-rose-400/20",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  a_appeler: "À appeler",
  pas_de_reponse: "Pas de réponse",
  rappel: "Rappel",
  qualifie: "Qualifié",
  non_qualifie: "Non qualifié",
  rdv_pris: "RDV pris",
  visite: "Visité",
  non_visite: "Pas venu",
  hors_budget: "Hors budget",
  vente: "Vendu",
  perdu: "Perdu",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  landing_page: "Landing Page",
  whatsapp: "WhatsApp",
  telephone: "Téléphone",
  organique: "Organique",
  recommandation: "Recommandation",
  salon: "Salon",
  autre: "Autre",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  visite: "Visité",
  non_visite: "Non visité",
  reporte: "Reporté",
  annule: "Annulé",
};

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  tres_chaud: "Très chaud",
  chaud: "Chaud",
  moyen: "Moyen",
  froid: "Froid",
};
