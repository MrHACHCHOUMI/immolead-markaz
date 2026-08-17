"use client";

import { useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
  Building2,
  Car,
  Pencil,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadExpenses, loadProjectOptions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import { formatCurrency } from "@/lib/utils";
import {
  EXPENSE_GROUP_LABELS,
  EXPENSE_KIND_LABELS,
  EXPENSE_KIND_META,
  type ExpenseGroup,
  type ExpenseKind,
  type ExpenseRow,
} from "@/lib/expenses";

const GROUP_FILTERS: { id: "all" | ExpenseGroup; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "marketing", label: "Marketing" },
  { id: "equipe", label: "Équipe" },
  { id: "agence", label: "Agence" },
  { id: "terrain", label: "Terrain" },
  { id: "autre", label: "Autre" },
];

function monthKey(date: string) {
  return date.slice(0, 7);
}

export function DepensesView() {
  const { data: expenses = [], loading, error } = useCachedQuery("expenses", loadExpenses);
  const { data: projects = [] } = useCachedQuery("project-options", loadProjectOptions);
  const [group, setGroup] = useState<"all" | ExpenseGroup>("all");
  const [projectId, setProjectId] = useState("all");
  const [period, setPeriod] = useState<"all" | "month">("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const rows = useMemo(() => {
    return expenses.filter((row) => {
      const meta = EXPENSE_KIND_META[row.kind];
      if (group !== "all" && meta.group !== group) return false;
      if (projectId === "none" && row.project_id) return false;
      if (projectId !== "all" && projectId !== "none" && row.project_id !== projectId) {
        return false;
      }
      if (period === "month" && monthKey(row.expense_date) !== thisMonth) return false;
      if (query.trim()) {
        const hay = `${row.display_description} ${row.supplier ?? ""} ${row.projects?.name ?? ""} ${EXPENSE_KIND_LABELS[row.kind]}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [expenses, group, projectId, period, query, thisMonth]);

  const totals = useMemo(() => {
    const ht = rows.reduce((sum, row) => sum + Number(row.amount_ht), 0);
    const ttc = rows.reduce(
      (sum, row) => sum + Number(row.amount_ttc ?? row.amount_ht),
      0
    );
    const monthRows = expenses.filter((row) => monthKey(row.expense_date) === thisMonth);
    const monthHt = monthRows.reduce((sum, row) => sum + Number(row.amount_ht), 0);

    const byGroup: Record<ExpenseGroup, number> = {
      marketing: 0,
      equipe: 0,
      agence: 0,
      terrain: 0,
      autre: 0,
    };
    for (const row of rows) {
      byGroup[EXPENSE_KIND_META[row.kind].group] += Number(row.amount_ht);
    }

    return { ht, ttc, monthHt, byGroup, count: rows.length };
  }, [rows, expenses, thisMonth]);

  async function removeExpense(id: string) {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase.from("expenses").delete().eq("id", id);
      if (delErr) throw delErr;
      invalidateCrm();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Dépenses" subtitle="Charges d’agence et de commercialisation" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Dépenses"
        subtitle="Charges d’agence et de commercialisation"
        actions={
          <button
            type="button"
            className="crm-btn"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle dépense
          </button>
        }
      />

      <div className="space-y-4 p-6">
        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total HT"
            value={formatCurrency(totals.ht)}
            hint={`${totals.count} charge${totals.count > 1 ? "s" : ""} affichée${totals.count > 1 ? "s" : ""}`}
            icon={<Receipt className="h-4 w-4" />}
          />
          <KpiCard title="Total TTC" value={formatCurrency(totals.ttc)} />
          <KpiCard
            title="Ce mois"
            value={formatCurrency(totals.monthHt)}
            hint="Toutes catégories, hors filtres"
          />
          <KpiCard
            title="Marketing"
            value={formatCurrency(totals.byGroup.marketing)}
            icon={<Megaphone className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="crm-panel flex items-center gap-3 p-4">
            <Users className="h-4 w-4 text-[#7ddea8]" />
            <div>
              <p className="text-xs text-white/40">Équipe</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(totals.byGroup.equipe)}
              </p>
            </div>
          </div>
          <div className="crm-panel flex items-center gap-3 p-4">
            <Building2 className="h-4 w-4 text-[#d7b56d]" />
            <div>
              <p className="text-xs text-white/40">Agence</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(totals.byGroup.agence)}
              </p>
            </div>
          </div>
          <div className="crm-panel flex items-center gap-3 p-4">
            <Car className="h-4 w-4 text-[#7ddea8]" />
            <div>
              <p className="text-xs text-white/40">Terrain</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(totals.byGroup.terrain)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {GROUP_FILTERS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGroup(opt.id)}
              className={
                group === opt.id
                  ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
              }
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod(period === "month" ? "all" : "month")}
            className={
              period === "month"
                ? "rounded-full bg-[#c4a35a] px-3 py-1.5 text-xs font-medium text-[#071510]"
                : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
            }
          >
            Ce mois
          </button>
          <select
            className="crm-input max-w-[220px] py-1.5 text-xs"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="all">Tous les projets</option>
            <option value="none">Charges générales</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Libellé, fournisseur, projet…"
              className="crm-input py-1.5 pl-10 text-xs"
            />
          </label>
        </div>

        <section className="crm-panel overflow-visible p-0">
          {rows.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-5 text-center text-sm text-white/45">
              <p>Aucune dépense pour ces filtres.</p>
              <button
                type="button"
                className="crm-btn"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter une charge
              </button>
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Catégorie</th>
                    <th className="px-4 py-3 font-medium">Libellé</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">HT</th>
                    <th className="px-4 py-3 font-medium">TTC</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-4 py-3 text-white/70">
                        {new Date(`${row.expense_date}T12:00:00`).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[#7ddea8]">
                          {EXPENSE_KIND_LABELS[row.kind as ExpenseKind]}
                        </span>
                        <p className="mt-1 text-[11px] text-white/35">
                          {EXPENSE_GROUP_LABELS[EXPENSE_KIND_META[row.kind].group]}
                        </p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 font-medium text-white">
                        <p className="truncate">{row.display_description}</p>
                        {row.comment ? (
                          <p className="truncate text-xs text-white/35">{row.comment}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[#7ddea8]">
                        {row.projects?.name ?? (
                          <span className="text-white/40">Générale</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">{row.supplier ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                        {formatCurrency(Number(row.amount_ht))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/70">
                        {row.amount_ttc != null
                          ? formatCurrency(Number(row.amount_ttc))
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="rounded-lg p-2 text-white/45 hover:bg-rose-500/10 hover:text-rose-200"
                            onClick={() => void removeExpense(row.id)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ExpenseFormModal
        open={formOpen}
        projects={projects}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
