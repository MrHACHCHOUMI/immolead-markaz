export type AgencySettings = {
  agency_name: string;
  tagline: string;
  city: string;
  phone: string;
  email: string;
  tva_rate: number;
  default_commission: number;
};

export const DEFAULT_AGENCY: AgencySettings = {
  agency_name: "ImmoLead × Markaz",
  tagline: "CRM Commercial",
  city: "",
  phone: "",
  email: "",
  tva_rate: 20,
  default_commission: 5,
};

const KEY = "crm-agency";
export const AGENCY_EVENT = "crm:agency";

export function readAgencySettings(): AgencySettings {
  if (typeof window === "undefined") return DEFAULT_AGENCY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AGENCY;
    return { ...DEFAULT_AGENCY, ...(JSON.parse(raw) as Partial<AgencySettings>) };
  } catch {
    return DEFAULT_AGENCY;
  }
}

export function writeAgencySettings(next: AgencySettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(AGENCY_EVENT));
}

export function agencyFromRow(data: {
  agency_name?: string | null;
  tagline?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  tva_rate?: number | string | null;
  default_commission?: number | string | null;
}): AgencySettings {
  return {
    agency_name: data.agency_name ?? DEFAULT_AGENCY.agency_name,
    tagline: data.tagline ?? DEFAULT_AGENCY.tagline,
    city: data.city ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    tva_rate: Number(data.tva_rate ?? DEFAULT_AGENCY.tva_rate),
    default_commission: Number(data.default_commission ?? DEFAULT_AGENCY.default_commission),
  };
}
