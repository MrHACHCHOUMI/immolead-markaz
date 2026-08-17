"use client";

import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadVisits } from "@/lib/queries";
import { APPOINTMENT_STATUS_LABELS, INTEREST_LEVEL_LABELS } from "@/lib/labels";

export function VisitesView() {
  const { data: visits = [], loading } = useCachedQuery("visits", loadVisits);

  if (loading) {
    return (
      <>
        <Topbar title="Visites" subtitle="Historique des visites terrain" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar title="Visites" subtitle="Historique des visites terrain" />

      <div className="space-y-4 p-6">
        <p className="text-sm text-white/50">
          {visits.length} visite{visits.length > 1 ? "s" : ""}
        </p>

        <section className="crm-panel overflow-visible p-0">
          {visits.length === 0 ? (
            <div className="crm-table-shell flex items-center justify-center px-5 text-center text-sm text-white/45">
              Aucune visite enregistrée.
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Visiteur</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Commercial</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Intérêt</th>
                    <th className="px-4 py-3 font-medium">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-white/70">
                        {new Date(visit.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {visit.leads ? (
                          <Link href={`/leads/${visit.lead_id}`} className="hover:text-[#7ddea8]">
                            {visit.leads.first_name} {visit.leads.last_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#7ddea8]">
                        {visit.projects?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {visit.users?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-0.5 text-xs text-[#7ddea8]">
                          {APPOINTMENT_STATUS_LABELS[visit.status] ?? visit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {visit.interest_level
                          ? INTEREST_LEVEL_LABELS[visit.interest_level]
                          : "—"}
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
