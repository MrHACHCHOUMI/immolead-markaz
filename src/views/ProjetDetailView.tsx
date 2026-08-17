"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CreateUnitButton } from "@/components/projects/CreateUnitButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadProjectOptions, loadProjects, loadUnits } from "@/lib/queries";
import { isAdminOrAbove } from "@/lib/auth/roles";
import {
  PROJECT_STATUS_LABELS,
  UNIT_STATUS_COLORS,
  UNIT_STATUS_LABELS,
} from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";

const PROPERTY_LABELS: Record<string, string> = {
  studio: "Studio",
  appartement: "Appartement",
  duplex: "Duplex",
  villa: "Villa",
  terrain: "Terrain",
  bureau: "Bureau",
  commerce: "Commerce",
  autre: "Autre",
};

export function ProjetDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const admin = isAdminOrAbove(user?.role);
  const { data: projects = [], loading } = useCachedQuery("projects", loadProjects);
  const { data: units = [] } = useCachedQuery("units", loadUnits);
  const { data: projectOptions = [] } = useCachedQuery("project-options", loadProjectOptions);

  const projet = projects.find((p) => p.id === id);
  const projectUnits = units.filter((u) => u.project_id === id);

  if (loading) {
    return (
      <>
        <Topbar title="Projet" />
        <PageSkeleton />
      </>
    );
  }

  if (!projet) {
    return (
      <>
        <Topbar title="Projet introuvable" />
        <div className="p-6 text-sm text-white/50">Ce projet n’existe pas.</div>
      </>
    );
  }

  const available = projectUnits.filter((u) => u.status === "disponible").length;
  const reserved = projectUnits.filter((u) => u.status === "reserve").length;
  const sold = projectUnits.filter((u) => u.status === "vendu").length;

  return (
    <>
      <Topbar
        title={projet.name}
        subtitle={`${projet.developer_name} · ${projet.city}`}
        actions={
          admin ? (
            <CreateUnitButton
              projects={projectOptions}
              defaultProjectId={projet.id}
              redirectTo={`/projets/${projet.id}`}
              label="Ajouter un bien"
            />
          ) : null
        }
      />

      <div className="space-y-6 p-6">
        <Link
          href="/projets"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#7ddea8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux projets
        </Link>

        <section className="crm-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-1 text-xs font-medium text-[#7ddea8]">
                {PROJECT_STATUS_LABELS[projet.status]}
              </span>
              <p className="mt-3 max-w-2xl text-sm text-white/55">
                {projet.description || "Aucune description."}
              </p>
              {projet.address ? (
                <p className="mt-2 text-sm text-white/40">{projet.address}</p>
              ) : null}
            </div>
            <div className="text-right text-sm">
              <p className="text-[#d7b56d]">Commission projet</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {projet.commission_type === "percentage"
                  ? `${projet.commission_value} %`
                  : projet.commission_type === "fixed"
                    ? `${formatCurrency(Number(projet.commission_value))}`
                    : "Personnalisée / lot"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Lots", value: projectUnits.length },
              { label: "Disponibles", value: available },
              { label: "Réservés", value: reserved },
              { label: "Vendus", value: sold },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-xs text-white/45">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="crm-panel overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h3 className="font-semibold text-white">Biens du projet</h3>
            {admin ? (
              <CreateUnitButton
                projects={projectOptions}
                defaultProjectId={projet.id}
                redirectTo={`/projets/${projet.id}`}
                label="Ajouter un bien"
              />
            ) : null}
          </div>

          {projectUnits.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-white/45">
              Aucun bien. Ajoute le premier lot à ce projet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Réf.</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Étage</th>
                    <th className="px-4 py-3 font-medium">Surface</th>
                    <th className="px-4 py-3 font-medium">Prix</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {projectUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        {unit.reference}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {PROPERTY_LABELS[unit.property_type] ?? unit.property_type}
                      </td>
                      <td className="px-4 py-3 text-white/70">{unit.floor ?? "—"}</td>
                      <td className="px-4 py-3 text-white/70">
                        {unit.surface ? `${unit.surface} m²` : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatCurrency(Number(unit.catalog_price))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${UNIT_STATUS_COLORS[unit.status]}`}
                        >
                          {UNIT_STATUS_LABELS[unit.status]}
                        </span>
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
