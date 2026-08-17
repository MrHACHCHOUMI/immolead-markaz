import { createClient } from "@/lib/supabase/client";
import { cachedQuery } from "@/lib/query-cache";
import type { Lead, Project, Sale, Unit, Visit } from "@/lib/types/database";

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

export type SaleRow = Sale & {
  projects: { id: string; name: string } | null;
  leads: { id: string; first_name: string; last_name: string; phone: string } | null;
  units: { id: string; reference: string } | null;
  commercial: { id: string; full_name: string } | null;
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
    const fields =
      "id, first_name, last_name, phone, project_id, status, last_comment, next_action_at, updated_at, created_at";

    type VisitLeadRow = {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      project_id: string;
      status: "visite" | "non_visite";
      last_comment: string | null;
      next_action_at: string | null;
      updated_at: string | null;
      created_at: string;
      projects?: { id: string; name: string } | { id: string; name: string }[] | null;
    };

    const first = await sb()
      .from("leads")
      .select(`${fields}, projects(id, name)`)
      .in("status", ["visite", "non_visite"])
      .order("created_at", { ascending: false });

    let rows: VisitLeadRow[] = (first.data ?? []) as VisitLeadRow[];

    if (first.error) {
      const retry = await sb()
        .from("leads")
        .select(fields)
        .in("status", ["visite", "non_visite"])
        .order("created_at", { ascending: false });
      if (retry.error) throw retry.error;
      rows = (retry.data ?? []) as VisitLeadRow[];
    }

    return rows.map((lead) => {
      const project = Array.isArray(lead.projects)
        ? lead.projects[0] ?? null
        : lead.projects ?? null;

      return {
        id: lead.id,
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
        next_action_date: lead.next_action_at,
        created_at: lead.updated_at || lead.created_at,
        updated_at: lead.updated_at || lead.created_at,
        leads: {
          first_name: lead.first_name,
          last_name: lead.last_name,
          phone: lead.phone,
        },
        projects: project,
        users: null,
      } as VisitRow;
    });
  });
}

export function loadSales() {
  return cachedQuery("sales", async () => {
    const { data, error } = await sb()
      .from("sales")
      .select(
        "id, project_id, unit_id, lead_id, commercial_id, sale_price, commission_amount, commission_type, commission_value, sale_date, comment, created_by, created_at, projects(id, name), leads(id, first_name, last_name, phone), units(id, reference)"
      )
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      project_id: string;
      unit_id: string;
      lead_id: string;
      commercial_id: string;
      sale_price: number;
      commission_amount: number;
      commission_type: Sale["commission_type"];
      commission_value: number;
      sale_date: string;
      comment: string | null;
      created_by: string | null;
      created_at: string;
      projects: { id: string; name: string } | { id: string; name: string }[] | null;
      leads:
        | { id: string; first_name: string; last_name: string; phone: string }
        | { id: string; first_name: string; last_name: string; phone: string }[]
        | null;
      units: { id: string; reference: string } | { id: string; reference: string }[] | null;
    }>;

    const commercialIds = [...new Set(rows.map((row) => row.commercial_id).filter(Boolean))];
    const names = new Map<string, string>();
    if (commercialIds.length > 0) {
      const { data: users } = await sb()
        .from("users")
        .select("id, full_name")
        .in("id", commercialIds);
      for (const user of (users ?? []) as { id: string; full_name: string }[]) {
        names.set(user.id, user.full_name);
      }
    }

    const one = <T,>(value: T | T[] | null | undefined): T | null =>
      Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

    return rows.map(
      (row) =>
        ({
          id: row.id,
          project_id: row.project_id,
          unit_id: row.unit_id,
          lead_id: row.lead_id,
          commercial_id: row.commercial_id,
          sale_price: Number(row.sale_price),
          commission_amount: Number(row.commission_amount),
          commission_type: row.commission_type,
          commission_value: Number(row.commission_value),
          sale_date: row.sale_date,
          comment: row.comment,
          created_by: row.created_by,
          created_at: row.created_at,
          projects: one(row.projects),
          leads: one(row.leads),
          units: one(row.units),
          commercial: names.has(row.commercial_id)
            ? { id: row.commercial_id, full_name: names.get(row.commercial_id)! }
            : null,
        }) as SaleRow
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
  if (href === "/ventes") void loadSales();
  if (href === "/dashboard") void loadDashboard(true);
}
