import Link from "next/link";
import type { Project } from "@/lib/types/database";
import { PROJECT_STATUS_LABELS } from "@/lib/labels";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ProjectCardProps = {
  project: Project;
  stats?: {
    available?: number;
    reserved?: number;
    sold?: number;
    revenue?: number;
  };
};

export function ProjectCard({ project, stats }: ProjectCardProps) {
  return (
    <Link
      href={`/projets/${project.id}`}
      className="block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {project.developer_name} · {project.city}
          </p>
        </div>
        <StatusBadge
          label={PROJECT_STATUS_LABELS[project.status]}
          className="bg-slate-50 text-slate-700 ring-slate-600/10"
        />
      </div>
      {stats ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
          <div>
            <p className="font-medium text-slate-900">{stats.available ?? 0}</p>
            <p>Disponibles</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">{stats.reserved ?? 0}</p>
            <p>Réservés</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">{stats.sold ?? 0}</p>
            <p>Vendus</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {(stats.revenue ?? 0).toLocaleString("fr-MA")} DH
            </p>
            <p>CA commission</p>
          </div>
        </div>
      ) : null}
    </Link>
  );
}
