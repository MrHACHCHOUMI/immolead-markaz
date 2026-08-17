"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CreateUnitButton } from "@/components/projects/CreateUnitButton";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadProjectOptions, loadUnits } from "@/lib/queries";
import { UNIT_STATUS_COLORS, UNIT_STATUS_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";

const PROPERTY_LABELS: Record<string, string> = {
  studio: "Studio",
  appartement: "Appartement",
  duplex: "Duplex",
  villa: "Villa",
  terrain: "Lot / Terrain",
  bureau: "Bureau",
  commerce: "Magasin",
  autre: "Autre",
};

export function BiensView() {
  const { data: units = [], loading } = useCachedQuery("units", loadUnits);
  const { data: projects = [] } = useCachedQuery("project-options", loadProjectOptions);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return units.filter((u) => {
      if (type && u.property_type !== type) return false;
      if (status && u.status !== status) return false;
      if (
        query &&
        !u.reference.toLowerCase().includes(query) &&
        !(u.projects?.name.toLowerCase().includes(query) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }, [units, type, status, q]);

  const typeCounts = useMemo(
    () =>
      units.reduce<Record<string, number>>((acc, u) => {
        acc[u.property_type] = (acc[u.property_type] ?? 0) + 1;
        return acc;
      }, {}),
    [units]
  );

  if (loading) {
    return (
      <>
        <Topbar title="Biens" subtitle="Appartements, villas, magasins, lots — tous projets" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Biens"
        subtitle="Appartements, villas, magasins, lots — tous projets"
        actions={
          <CreateUnitButton
            projects={projects}
            redirectTo="/biens"
            label="Ajouter un bien"
          />
        }
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-white/50">
          {filtered.length} bien{filtered.length > 1 ? "s" : ""} affiché
          {filtered.length > 1 ? "s" : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setType("")}
            className={
              !type
                ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
            }
          >
            Tous
          </button>
          {(
            [
              "appartement",
              "villa",
              "commerce",
              "studio",
              "duplex",
              "terrain",
              "bureau",
            ] as const
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={
                type === t
                  ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white"
              }
            >
              {PROPERTY_LABELS[t]} ({typeCounts[t] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Réf. ou projet…"
            className="crm-input max-w-xs"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="crm-input max-w-[180px]"
          >
            <option value="">Tous statuts</option>
            <option value="disponible">Disponible</option>
            <option value="option">Option</option>
            <option value="reserve">Réservé</option>
            <option value="vendu">Vendu</option>
            <option value="bloque">Bloqué</option>
          </select>
        </div>

        <section className="crm-panel overflow-visible p-0">
          {filtered.length === 0 ? (
            <div className="crm-table-shell flex items-center justify-center px-5 text-center text-sm text-white/45">
              <div>
                Aucun bien pour le moment.
                <div className="mt-4 flex justify-center">
                  <CreateUnitButton
                    projects={projects}
                    redirectTo="/biens"
                    label="Ajouter un bien"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Réf.</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Ville</th>
                    <th className="px-4 py-3 font-medium">Surface</th>
                    <th className="px-4 py-3 font-medium">Prix</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((unit) => (
                    <tr key={unit.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        {unit.reference}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {PROPERTY_LABELS[unit.property_type] ?? unit.property_type}
                      </td>
                      <td className="px-4 py-3">
                        {unit.projects ? (
                          <Link
                            href={`/projets/${unit.projects.id}`}
                            className="text-[#7ddea8] hover:underline"
                          >
                            {unit.projects.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {unit.projects?.city ?? "—"}
                      </td>
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
