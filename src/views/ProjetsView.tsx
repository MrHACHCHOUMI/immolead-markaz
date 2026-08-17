"use client";

import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CreateProjectButton } from "@/components/projects/CreateProjectButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadProjects, loadUnitCounts } from "@/lib/queries";
import { isAdminOrAbove } from "@/lib/auth/roles";
import { PROJECT_STATUS_LABELS } from "@/lib/labels";

export function ProjetsView() {
  const { user } = useAuth();
  const admin = isAdminOrAbove(user?.role);
  const { data: list = [], loading } = useCachedQuery("projects", loadProjects);
  const { data: countMap = {} } = useCachedQuery("unit-counts", loadUnitCounts);

  if (loading) {
    return (
      <>
        <Topbar title="Projets" subtitle="Programmes immobiliers" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Projets"
        subtitle="Programmes immobiliers"
        actions={admin ? <CreateProjectButton /> : null}
      />

      <div className="space-y-4 p-6">
        <section className="crm-panel overflow-visible p-0">
          {list.length === 0 ? (
            <div className="crm-table-shell flex items-center justify-center px-5 text-center text-sm text-white/45">
              <div>
                Aucun projet.
                {admin ? (
                  <div className="mt-4 flex justify-center">
                    <CreateProjectButton />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Promoteur</th>
                    <th className="px-4 py-3 font-medium">Ville</th>
                    <th className="px-4 py-3 font-medium">Biens</th>
                    <th className="px-4 py-3 font-medium">Disponibles</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.map((project) => {
                    const stats = countMap[project.id];
                    return (
                      <tr key={project.id} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 font-medium text-white">
                          <Link
                            href={`/projets/${project.id}`}
                            prefetch={true}
                            className="hover:text-[#7ddea8]"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {project.developer_name}
                        </td>
                        <td className="px-4 py-3 text-white/70">{project.city}</td>
                        <td className="px-4 py-3 text-white">{stats?.total ?? 0}</td>
                        <td className="px-4 py-3 text-[#7ddea8]">
                          {stats?.available ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-0.5 text-xs font-medium text-[#7ddea8]">
                            {PROJECT_STATUS_LABELS[project.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
