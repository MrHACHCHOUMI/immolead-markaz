export type UserRole = "super_admin" | "admin" | "crc" | "commercial";

export type ProjectStatus = "actif" | "en_pause" | "termine" | "archive";

export type CommissionType = "percentage" | "fixed" | "custom_per_unit";

export type PropertyType =
  | "studio"
  | "appartement"
  | "duplex"
  | "villa"
  | "terrain"
  | "bureau"
  | "commerce"
  | "autre";

export type UnitStatus =
  | "disponible"
  | "option"
  | "reserve"
  | "vendu"
  | "bloque";

export type LeadSource =
  | "meta_ads"
  | "google_ads"
  | "landing_page"
  | "whatsapp"
  | "telephone"
  | "organique"
  | "recommandation"
  | "salon"
  | "autre";

export type LeadStatus =
  | "nouveau"
  | "a_appeler"
  | "pas_de_reponse"
  | "rappel"
  | "qualifie"
  | "non_qualifie"
  | "rdv_pris"
  | "visite"
  | "non_visite"
  | "hors_budget"
  | "vente"
  | "perdu";

export type CallResult =
  | "reponse"
  | "pas_de_reponse"
  | "telephone_eteint"
  | "mauvais_numero"
  | "rappeler"
  | "interesse"
  | "non_interesse"
  | "rdv_obtenu";

export type AppointmentStatus =
  | "planifie"
  | "confirme"
  | "visite"
  | "non_visite"
  | "reporte"
  | "annule";

export type InterestLevel = "tres_chaud" | "chaud" | "moyen" | "froid";

export type ExpenseCategory =
  | "meta_ads"
  | "google_ads"
  | "production_video"
  | "shooting"
  | "influenceur"
  | "impression"
  | "deplacement"
  | "commercial"
  | "centre_appel"
  | "logiciel"
  | "autre";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  developer_name: string;
  city: string;
  address: string | null;
  description: string | null;
  image_url: string | null;
  commission_type: CommissionType;
  commission_value: number;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Unit {
  id: string;
  project_id: string;
  reference: string;
  property_type: PropertyType;
  floor: string | null;
  surface: number | null;
  bedrooms: number | null;
  catalog_price: number;
  sale_price: number | null;
  price_per_sqm: number | null;
  commission_type: CommissionType | null;
  commission_value: number | null;
  status: UnitStatus;
  client_lead_id: string | null;
  sold_by: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  project_id: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_crc_id: string | null;
  next_action_at: string | null;
  last_comment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadCall {
  id: string;
  lead_id: string;
  crc_id: string;
  call_date: string;
  result: CallResult;
  comment: string | null;
  next_action_date: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string;
  project_id: string;
  crc_id: string | null;
  commercial_id: string | null;
  appointment_date: string;
  status: AppointmentStatus;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  appointment_id: string | null;
  lead_id: string;
  project_id: string;
  commercial_id: string;
  status: AppointmentStatus;
  interest_level: InterestLevel | null;
  budget: number | null;
  property_type: PropertyType | null;
  lot_id: string | null;
  comment: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  project_id: string;
  unit_id: string;
  lead_id: string;
  commercial_id: string;
  sale_price: number;
  commission_amount: number;
  commission_type: CommissionType;
  commission_value: number;
  sale_date: string;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  project_id: string | null;
  category: ExpenseCategory;
  description: string;
  amount_ht: number;
  amount_ttc: number | null;
  expense_date: string;
  supplier: string | null;
  document_url: string | null;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  project_id: string | null;
  user_id: string | null;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User> & Pick<User, "id" | "full_name" | "email" | "role">; Update: Partial<User> };
      projects: { Row: Project; Insert: Omit<Project, "id" | "created_at" | "updated_at"> & { id?: string }; Update: Partial<Project> };
      project_users: { Row: ProjectUser; Insert: Omit<ProjectUser, "id" | "created_at"> & { id?: string }; Update: Partial<ProjectUser> };
      units: { Row: Unit; Insert: Omit<Unit, "id" | "created_at" | "updated_at" | "price_per_sqm"> & { id?: string }; Update: Partial<Unit> };
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at"> & { id?: string }; Update: Partial<Lead> };
      lead_calls: { Row: LeadCall; Insert: Omit<LeadCall, "id" | "created_at"> & { id?: string }; Update: Partial<LeadCall> };
      appointments: { Row: Appointment; Insert: Omit<Appointment, "id" | "created_at" | "updated_at"> & { id?: string }; Update: Partial<Appointment> };
      visits: { Row: Visit; Insert: Omit<Visit, "id" | "created_at" | "updated_at"> & { id?: string }; Update: Partial<Visit> };
      sales: { Row: Sale; Insert: Omit<Sale, "id" | "created_at"> & { id?: string }; Update: Partial<Sale> };
      expenses: { Row: Expense; Insert: Omit<Expense, "id" | "created_at"> & { id?: string }; Update: Partial<Expense> };
      activities: { Row: Activity; Insert: Omit<Activity, "id" | "created_at"> & { id?: string }; Update: Partial<Activity> };
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at" | "read"> & { id?: string; read?: boolean }; Update: Partial<Notification> };
    };
  };
};
