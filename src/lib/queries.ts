import { createClient } from "@/lib/supabase/client";
import { cachedQuery } from "@/lib/query-cache";
import type { Lead, Project, Unit, Visit } from "@/lib/types/database";

export type ProjectOption = { id: string; name: string };
export type UnitRow = Unit & {
  projects: { id: string; name: string; city: string } | null;
};
export type LeadRow = Lead & {
  projects: { id: string; name: string } | null;
};
export type VisitRow = Visit & {
  leads: { first_name: string; last_name: string; phone: string } | null;
  projects: { id: string; name: string } | null;
  users: { full_name: string } | null;
};

export type DashboardStats = {
  projects: number;
  leads: number;
  appointments: number;
  visits: number;
  salesCount: number;
  commissionCa: number;
  volume: number;
  expensesTotal: number;
};

function sb() {
  return createClient();
}

export function loadProjects() {
  return cachedQuery("projects", async () => {
    const { data, error } = await sb()
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Project[];
  });
}

export function loadProjectOptions() {
  return cachedQuery("project-options", async () => {
    const { data, error } = await sb()
      .from("projects")
      .select("id, name")
      .order("name");
    if (error) throw error;
    return (data ?? []) as ProjectOption[];
  });
}

export function loadUnits() {
  return cachedQuery("units", async () => {
    const { data, error } = await sb()
      .from("units")
      .select("*, projects(id, name, city)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as UnitRow[];
  });
}

export function loadUnitCounts() {
  return cachedQuery("unit-counts", async () => {
    const { data, error } = await sb().from("units").select("project_id, status");
    if (error) throw error;
    const map: Record<string, { total: number; available: number }> = {};
    for (const row of (data ?? []) as { project_id: string; status: string }[]) {
      if (!map[row.project_id]) map[row.project_id] = { total: 0, available: 0 };
      map[row.project_id].total += 1;
      if (row.status === "disponible") map[row.project_id].available += 1;
    }
    return map;
  });
}

export function loadLeads() {
  return cachedQuery("leads", async () => {
    const { data, error } = await sb()
      .from("leads")
      .select("*, projects(id, name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LeadRow[];
  });
}

export function loadVisits() {
  return cachedQuery("visits", async () => {
    const client = sb();
    const [{ data, error }, { data: leadRows, error: leadErr }] = await Promise.all([
      client
        .from("visits")
        .select(
          "*, leads(first_name, last_name, phone), projects(id, name), users:commercial_id(full_name)"
        )
        .order("created_at", { ascending: false }),
      client
        .from("leads")
        .select("id, first_name, last_name, phone, project_id, status, last_comment, updated_at, created_at, projects(id, name)")
        .in("status", ["visite", "non_visite"])
        .order("updated_at", { ascending: false }),
    ]);

    if (error) throw error;
    if (leadErr) throw leadErr;

    const visits = (data ?? []) as VisitRow[];
    const seen = new Set(visits.map((v) => v.lead_id));

    const fromLeads = ((leadRows ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      project_id: string;
      status: "visite" | "non_visite";
      last_comment: string | null;
      updated_at: string;
      created_at: string;
      projects: { id: string; name: string } | null;
    }>)
      .filter((lead) => !seen.has(lead.id))
      .map(
        (lead) =>
          ({
            id: `lead-${lead.id}`,
            appointment_id: null,
            lead_id: lead.id,
            project_id: lead.project_id,
            commercial_id: "",
            status: lead.status,
            interest_level: null,
            budget: null,
            property_type: null,
            lot_id: null,
            comment: lead.last_comment,
            next_action_date: null,
            created_at: lead.updated_at || lead.created_at,
            updated_at: lead.updated_at || lead.created_at,
            leads: {
              first_name: lead.first_name,
              last_name: lead.last_name,
              phone: lead.phone,
            },
            projects: lead.projects,
            users: null,
          }) as VisitRow
      );

    return [...visits, ...fromLeads].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

export function loadDashboard(admin: boolean) {
  return cachedQuery(`dashboard:${admin ? "admin" : "user"}`, async () => {
    const client = sb();
    const [leads, appointments, visits, salesRes, expensesRes, projects] =
      await Promise.all([
        client.from("leads").select("id", { count: "exact", head: true }),
        client.from("appointments").select("id", { count: "exact", head: true }),
        client.from("visits").select("id", { count: "exact", head: true }).eq("status", "visite"),
        client.from("sales").select("commission_amount, sale_price"),
        admin
          ? client.from("expenses").select("amount_ht")
          : Promise.resolve({ data: [] as { amount_ht: number }[] | null }),
        client.from("projects").select("id", { count: "exact", head: true }),
      ]);

    const sales =
      (salesRes.data as { commission_amount: number; sale_price: number }[] | null) ??
      [];
    const expenses = (expensesRes.data as { amount_ht: number }[] | null) ?? [];

    return {
      projects: projects.count ?? 0,
      leads: leads.count ?? 0,
      appointments: appointments.count ?? 0,
      visits: visits.count ?? 0,
      salesCount: sales.length,
      commissionCa: sales.reduce((s, r) => s + Number(r.commission_amount), 0),
      volume: sales.reduce((s, r) => s + Number(r.sale_price), 0),
      expensesTotal: expenses.reduce((s, r) => s + Number(r.amount_ht), 0),
    } satisfies DashboardStats;
  });
}

export function prefetchNav(href: string) {
  if (href === "/projets" || href === "/biens") {
    void loadProjects();
    void loadUnits();
    void loadUnitCounts();
    void loadProjectOptions();
  }
  if (href === "/leads" || href === "/prospects") {
    void loadLeads();
    void loadProjectOptions();
  }
  if (href === "/visites" || href === "/visiteurs") void loadVisits();
  if (href === "/dashboard") void loadDashboard(true);
}
