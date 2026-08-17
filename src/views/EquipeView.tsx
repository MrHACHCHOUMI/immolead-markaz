"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CreateMemberButton } from "@/components/team/CreateMemberButton";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadProjectOptions, loadTeam } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { assignMemberProject, setMemberActive } from "@/lib/create-team-member";
import { invalidateCrm } from "@/lib/query-cache";

export function EquipeView() {
  const { data: members = [], loading, error } = useCachedQuery("team", loadTeam);
  const { data: projects = [] } = useCachedQuery("project-options", loadProjectOptions);
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onAssign(userId: string, role: "crc" | "commercial" | "admin" | "super_admin", projectId: string) {
    if (!projectId) return;
    setBusy(userId);
    setLocalError(null);
    try {
      await assignMemberProject(userId, projectId, role);
      invalidateCrm();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Affectation impossible");
    } finally {
      setBusy(null);
    }
  }

  async function onToggle(userId: string, active: boolean) {
    setBusy(userId);
    setLocalError(null);
    try {
      await setMemberActive(userId, active);
      invalidateCrm();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Équipe" subtitle="CRC, commerciaux et affectation projet" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Équipe"
        subtitle="CRC, commerciaux et affectation projet"
        actions={<CreateMemberButton projects={projects} />}
      />

      <div className="space-y-4 p-6">
        {error || localError ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {localError ?? error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#d7b56d]/25 bg-[#d7b56d]/10 px-4 py-3 text-sm text-[#f0e2b8]">
          Pour que chaque agent ne voie que son projet, exécute{" "}
          <span className="font-semibold">supabase/FIX_team_access.sql</span> dans
          Supabase → SQL Editor.
        </div>

        <p className="text-sm text-white/50">
          Chaque CRC ou commercial voit uniquement le projet qu’on lui assigne : leads,
          visites et biens.
        </p>

        <section className="crm-panel overflow-visible p-0">
          {members.length === 0 ? (
            <div className="flex min-h-[140px] items-center justify-center px-5 text-sm text-white/45">
              Aucun utilisateur.
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 font-medium">Projet(s)</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Assigner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        {member.full_name}
                      </td>
                      <td className="px-4 py-3 text-white/70">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-0.5 text-xs text-[#7ddea8]">
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#7ddea8]">
                        {member.projects.length
                          ? member.projects.map((p) => p.name).join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {member.role === "super_admin" ? (
                          <span className="text-xs text-white/40">Toujours actif</span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === member.id}
                            onClick={() => void onToggle(member.id, !member.active)}
                            className={
                              member.active
                                ? "text-xs text-[#7ddea8] hover:underline"
                                : "text-xs text-rose-300 hover:underline"
                            }
                          >
                            {member.active ? "Actif" : "Désactivé"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {member.role === "crc" || member.role === "commercial" ? (
                          <select
                            className="crm-input max-w-[200px] py-1.5 text-xs"
                            defaultValue=""
                            disabled={busy === member.id}
                            onChange={(e) => {
                              const value = e.target.value;
                              e.currentTarget.value = "";
                              void onAssign(member.id, member.role, value);
                            }}
                          >
                            <option value="">Ajouter un projet</option>
                            {projects
                              .filter((p) => !member.projects.some((m) => m.id === p.id))
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-xs text-white/35">Tous les projets</span>
                        )}
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
