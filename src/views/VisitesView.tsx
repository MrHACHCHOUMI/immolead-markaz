"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadVisits } from "@/lib/queries";
import { LEAD_STATUS_LABELS } from "@/lib/labels";

export function VisitesView() {
  const { data: visits = [], loading, error } = useCachedQuery("visits", loadVisits);
  const [filter, setFilter] = useState<"visite" | "non_visite" | "all">("visite");

  const rows = useMemo(() => {
    if (filter === "all") return visits;
    return visits.filter((v) => v.status === filter);
  }, [visits, filter]);

  if (loading) {
    return (
      <>
        <Topbar title="Visites" subtitle="Leads qualifiés Visité" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar title="Visites" subtitle="Leads qualifiés Visité" />

      <div className="space-y-4 p-6">
        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            {rows.length} visiteur{rows.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "visite", label: "Visité" },
                { id: "non_visite", label: "Pas venu" },
                { id: "all", label: "Tous" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={
                  filter === opt.id
                    ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <section className="crm-panel overflow-visible p-0">
          {rows.length === 0 ? (
            <div className="crm-table-shell flex items-center justify-center px-5 text-center text-sm text-white/45">
              Aucun lead visité pour le moment.
              <br />
              Qualifie un lead en « Visité » depuis Leads.
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Visiteur</th>
                    <th className="px-4 py-3 font-medium">Téléphone</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((visit) => (
                    <tr key={visit.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-white/70">
                        {new Date(visit.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/leads/${visit.lead_id}`}
                          className="hover:text-[#7ddea8]"
                        >
                          {visit.leads?.first_name} {visit.leads?.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {visit.leads?.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#7ddea8]">
                        {visit.projects?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-0.5 text-xs text-[#7ddea8]">
                          {LEAD_STATUS_LABELS[visit.status] ?? visit.status}
                        </span>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-white/50">
                        {visit.comment ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
