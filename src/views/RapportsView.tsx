"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  MapPin,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import {
  loadExpenses,
  loadLeads,
  loadProjects,
  loadSales,
  loadUnits,
  loadVisits,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import { LEAD_SOURCE_LABELS } from "@/lib/labels";
import {
  EXPENSE_GROUP_LABELS,
  EXPENSE_KIND_LABELS,
  EXPENSE_KIND_META,
  type ExpenseGroup,
} from "@/lib/expenses";

type Period = "month" | "30d" | "year" | "all";

const GREEN = "#1f8f63";
const MINT = "#7ddea8";
const GOLD = "#d7b56d";
const ROSE = "#fb7185";
const PIE = ["#1f8f63", "#d7b56d", "#7ddea8", "#38bdf8", "#fb7185", "#a78bfa", "#f59e0b"];

function inPeriod(iso: string | null | undefined, period: Period) {
  if (period === "all" || !iso) return true;
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  if (period === "month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (period === "year") return date.getFullYear() === now.getFullYear();
  const from = new Date(now);
  from.setDate(now.getDate() - 30);
  return date >= from;
}

function monthKey(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

function pct(part: number, total: number) {
  if (!total) return "0 %";
  return `${Math.round((part / total) * 1000) / 10} %`;
}

const tooltipStyle = {
  background: "#0b1c16",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 12,
};

export function RapportsView() {
  const { data: leads = [], loading: l1 } = useCachedQuery("leads", loadLeads);
  const { data: sales = [], loading: l2 } = useCachedQuery("sales", loadSales);
  const { data: expenses = [], loading: l3 } = useCachedQuery("expenses", loadExpenses);
  const { data: visits = [], loading: l4 } = useCachedQuery("visits", loadVisits);
  const { data: units = [], loading: l5 } = useCachedQuery("units", loadUnits);
  const { data: projects = [], loading: l6 } = useCachedQuery("projects", loadProjects);
  const [period, setPeriod] = useState<Period>("month");
  const [projectId, setProjectId] = useState("all");

  const loading = l1 || l2 || l3 || l4 || l5 || l6;

  const report = useMemo(() => {
    const leadRows = leads.filter(
      (row) =>
        (projectId === "all" || row.project_id === projectId) &&
        inPeriod(row.created_at, period)
    );
    const visitRows = visits.filter(
      (row) =>
        (projectId === "all" || row.project_id === projectId) &&
        inPeriod(row.created_at, period)
    );
    const saleRows = sales.filter(
      (row) =>
        (projectId === "all" || row.project_id === projectId) &&
        inPeriod(row.sale_date, period)
    );
    const expenseRows = expenses.filter(
      (row) =>
        (projectId === "all" || row.project_id === projectId || (projectId === "all" && !row.project_id)) &&
        inPeriod(row.expense_date, period)
    );
    const unitRows =
      projectId === "all" ? units : units.filter((u) => u.project_id === projectId);

    const visited = visitRows.filter((v) => v.status === "visite").length;
    const noShow = visitRows.filter((v) => v.status === "non_visite").length;
    const volume = saleRows.reduce((s, r) => s + Number(r.sale_price), 0);
    const commission = saleRows.reduce((s, r) => s + Number(r.commission_amount), 0);
    const charges = expenseRows.reduce((s, r) => s + Number(r.amount_ht), 0);
    const result = commission - charges;
    const soldUnits = unitRows.filter((u) => u.status === "vendu").length;
    const available = unitRows.filter((u) => u.status === "disponible").length;

    const keys: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const evolution = keys.map((key) => ({
      name: monthLabel(key),
      leads: leads.filter(
        (r) => (projectId === "all" || r.project_id === projectId) && monthKey(r.created_at) === key
      ).length,
      visites: visits.filter(
        (r) =>
          (projectId === "all" || r.project_id === projectId) &&
          monthKey(r.created_at) === key &&
          r.status === "visite"
      ).length,
      ventes: sales.filter(
        (r) => (projectId === "all" || r.project_id === projectId) && monthKey(r.sale_date) === key
      ).length,
      ca: sales
        .filter((r) => (projectId === "all" || r.project_id === projectId) && monthKey(r.sale_date) === key)
        .reduce((s, r) => s + Number(r.commission_amount), 0),
      charges: expenses
        .filter(
          (r) =>
            (projectId === "all" || r.project_id === projectId) &&
            monthKey(r.expense_date) === key
        )
        .reduce((s, r) => s + Number(r.amount_ht), 0),
    }));

    const byProject = projects
      .filter((p) => projectId === "all" || p.id === projectId)
      .map((project) => {
        const pLeads = leadRows.filter((r) => r.project_id === project.id);
        const pVisits = visitRows.filter((r) => r.project_id === project.id && r.status === "visite");
        const pSales = saleRows.filter((r) => r.project_id === project.id);
        const pExp = expenseRows.filter((r) => r.project_id === project.id);
        const pUnits = units.filter((u) => u.project_id === project.id);
        const ca = pSales.reduce((s, r) => s + Number(r.commission_amount), 0);
        const exp = pExp.reduce((s, r) => s + Number(r.amount_ht), 0);
        return {
          id: project.id,
          name: project.name,
          leads: pLeads.length,
          visites: pVisits.length,
          ventes: pSales.length,
          volume: pSales.reduce((s, r) => s + Number(r.sale_price), 0),
          ca,
          charges: exp,
          result: ca - exp,
          lots: pUnits.length,
          vendus: pUnits.filter((u) => u.status === "vendu").length,
        };
      })
      .sort((a, b) => b.ca - a.ca);

    const byCommercial = Object.values(
      saleRows.reduce<
        Record<string, { name: string; ventes: number; volume: number; ca: number }>
      >((acc, sale) => {
        const name = sale.commercial?.full_name || "Non renseigné";
        if (!acc[name]) acc[name] = { name, ventes: 0, volume: 0, ca: 0 };
        acc[name].ventes += 1;
        acc[name].volume += Number(sale.sale_price);
        acc[name].ca += Number(sale.commission_amount);
        return acc;
      }, {})
    ).sort((a, b) => b.ca - a.ca);

    const sources = Object.entries(
      leadRows.reduce<Record<string, number>>((acc, lead) => {
        const key = LEAD_SOURCE_LABELS[lead.source] ?? lead.source;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const chargeGroups = (Object.keys(EXPENSE_GROUP_LABELS) as ExpenseGroup[])
      .map((group) => ({
        name: EXPENSE_GROUP_LABELS[group],
        value: expenseRows
          .filter((row) => EXPENSE_KIND_META[row.kind].group === group)
          .reduce((s, r) => s + Number(r.amount_ht), 0),
      }))
      .filter((row) => row.value > 0);

    const topCharges = Object.values(
      expenseRows.reduce<Record<string, { name: string; value: number }>>((acc, row) => {
        const name = EXPENSE_KIND_LABELS[row.kind] ?? row.kind;
        if (!acc[name]) acc[name] = { name, value: 0 };
        acc[name].value += Number(row.amount_ht);
        return acc;
      }, {})
    )
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      leadRows,
      visitRows,
      saleRows,
      visited,
      noShow,
      volume,
      commission,
      charges,
      result,
      soldUnits,
      available,
      evolution,
      byProject,
      byCommercial,
      sources,
      chargeGroups,
      topCharges,
    };
  }, [leads, sales, expenses, visits, units, projects, period, projectId]);

  if (loading) {
    return (
      <>
        <Topbar title="Rapports" subtitle="Vision commerciale, stock et rentabilité" />
        <PageSkeleton />
      </>
    );
  }

  const visitToSale = pct(report.saleRows.length, report.visited);
  const leadToVisit = pct(report.visited, report.leadRows.length);
  const leadToSale = pct(report.saleRows.length, report.leadRows.length);

  return (
    <>
      <Topbar title="Rapports" subtitle="Vision commerciale, stock et rentabilité" />

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "month", label: "Ce mois" },
              { id: "30d", label: "30 jours" },
              { id: "year", label: "Cette année" },
              { id: "all", label: "Tout" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={
                period === opt.id
                  ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
              }
            >
              {opt.label}
            </button>
          ))}
          <select
            className="crm-input max-w-[240px] py-1.5 text-xs"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="all">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Leads"
            value={report.leadRows.length}
            hint={`${leadToVisit} deviennent visite`}
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard
            title="Visites"
            value={report.visited}
            hint={`${report.noShow} absents · ${visitToSale} convertis en vente`}
            icon={<MapPin className="h-4 w-4" />}
          />
          <KpiCard
            title="CA commissions"
            value={formatCurrency(report.commission)}
            hint={`${report.saleRows.length} ventes · vol. ${formatCurrency(report.volume)}`}
            icon={<BadgeDollarSign className="h-4 w-4" />}
          />
          <KpiCard
            title="Résultat"
            value={formatCurrency(report.result)}
            hint={`Charges ${formatCurrency(report.charges)}`}
            icon={
              report.result >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Insight
            title="Tunnel"
            text={`${report.leadRows.length} leads → ${report.visited} visites → ${report.saleRows.length} ventes. Taux lead → vente : ${leadToSale}.`}
          />
          <Insight
            title="Stock"
            text={`${report.available} lots disponibles, ${report.soldUnits} vendus. ${pct(report.soldUnits, report.available + report.soldUnits)} du stock suivi est vendu.`}
          />
          <Insight
            title="Rentabilité"
            text={
              report.commission === 0 && report.charges === 0
                ? "Pas encore de CA ni de charges sur cette période."
                : report.result >= 0
                  ? `Les commissions couvrent les charges. Marge ${pct(report.result, report.commission || 1)}.`
                  : `Les charges dépassent le CA commissions de ${formatCurrency(Math.abs(report.result))}.`
            }
          />
        </div>

        <section className="crm-panel p-5">
          <h3 className="text-base font-semibold text-white">Tunnel commercial</h3>
          <p className="mt-1 text-sm text-white/45">Leads → visites → ventes → CA</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Leads", value: String(report.leadRows.length), hint: "Entrée tunnel" },
              { label: "Visites", value: String(report.visited), hint: leadToVisit },
              { label: "Ventes", value: String(report.saleRows.length), hint: visitToSale },
              { label: "CA", value: formatCurrency(report.commission), hint: "Commissions" },
            ].map((step) => (
              <div
                key={step.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d7b56d]">
                  {step.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{step.value}</p>
                <p className="mt-1 text-xs text-white/40">{step.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="crm-panel p-5">
            <h3 className="text-base font-semibold text-white">Activité sur 6 mois</h3>
            <p className="mt-1 text-sm text-white/45">Leads, visites et ventes</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.evolution}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill={GOLD} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="visites" name="Visites" fill={MINT} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="ventes" name="Ventes" fill={GREEN} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="crm-panel p-5">
            <h3 className="text-base font-semibold text-white">CA vs charges</h3>
            <p className="mt-1 text-sm text-white/45">Commissions et dépenses HT</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.evolution}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ca" name="CA commissions" stroke={MINT} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="charges" name="Charges" stroke={ROSE} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="crm-panel overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-base font-semibold text-white">Performance par projet</h3>
            <p className="mt-1 text-sm text-white/45">
              Volume, commissions, charges et lots vendus
            </p>
          </div>
          {report.byProject.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/45">Aucun projet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Leads</th>
                    <th className="px-4 py-3 font-medium">Visites</th>
                    <th className="px-4 py-3 font-medium">Ventes</th>
                    <th className="px-4 py-3 font-medium">Volume</th>
                    <th className="px-4 py-3 font-medium">CA</th>
                    <th className="px-4 py-3 font-medium">Charges</th>
                    <th className="px-4 py-3 font-medium">Résultat</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {report.byProject.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-4 py-3 text-white/70">{row.leads}</td>
                      <td className="px-4 py-3 text-white/70">{row.visites}</td>
                      <td className="px-4 py-3 text-white/70">{row.ventes}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/80">
                        {formatCurrency(row.volume)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#7ddea8]">
                        {formatCurrency(row.ca)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/70">
                        {formatCurrency(row.charges)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-medium ${row.result >= 0 ? "text-[#7ddea8]" : "text-rose-300"}`}
                      >
                        {formatCurrency(row.result)}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {row.vendus}/{row.lots}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="crm-panel overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="text-base font-semibold text-white">Commerciaux</h3>
              <p className="mt-1 text-sm text-white/45">Qui a marqué les ventes</p>
            </div>
            {report.byCommercial.length === 0 ? (
              <p className="px-5 py-8 text-sm text-white/45">Aucune vente sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/45">
                    <tr>
                      <th className="px-4 py-3 font-medium">Commercial</th>
                      <th className="px-4 py-3 font-medium">Ventes</th>
                      <th className="px-4 py-3 font-medium">Volume</th>
                      <th className="px-4 py-3 font-medium">CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {report.byCommercial.map((row) => (
                      <tr key={row.name}>
                        <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                        <td className="px-4 py-3 text-white/70">{row.ventes}</td>
                        <td className="px-4 py-3 text-white/80">{formatCurrency(row.volume)}</td>
                        <td className="px-4 py-3 text-[#7ddea8]">{formatCurrency(row.ca)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="crm-panel p-5">
            <h3 className="text-base font-semibold text-white">Répartition des charges</h3>
            <p className="mt-1 text-sm text-white/45">Marketing, équipe, agence, terrain</p>
            {report.chargeGroups.length === 0 ? (
              <p className="mt-8 text-sm text-white/45">Aucune dépense sur la période.</p>
            ) : (
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={report.chargeGroups} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74}>
                        {report.chargeGroups.map((entry, i) => (
                          <Cell key={entry.name} fill={PIE[i % PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 self-center text-sm">
                  {report.topCharges.map((row) => (
                    <li key={row.name} className="flex justify-between gap-3 text-white/70">
                      <span>{row.name}</span>
                      <span className="text-white">{formatCurrency(row.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <section className="crm-panel p-5">
          <h3 className="text-base font-semibold text-white">Origine des leads</h3>
          <p className="mt-1 text-sm text-white/45">D’où viennent les prospects sur la période</p>
          {report.sources.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">Aucun lead sur la période.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {report.sources.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-sm text-white/70">{row.name}</span>
                  <span className="text-sm font-semibold text-white">
                    {row.value} · {pct(row.value, report.leadRows.length)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="crm-panel p-5">
      <div className="mb-2 flex items-center gap-2 text-[#d7b56d]">
        <Receipt className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-sm leading-relaxed text-white/75">{text}</p>
    </div>
  );
}
