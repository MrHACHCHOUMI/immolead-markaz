"use client";

import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CreateLeadButton } from "@/components/leads/CreateLeadButton";
import { LeadStatusQualify } from "@/components/leads/LeadStatusQualify";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadLeads, loadProjectOptions } from "@/lib/queries";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdminOrAbove } from "@/lib/auth/roles";
import { LEAD_SOURCE_LABELS } from "@/lib/labels";

export function LeadsView() {
  const { user } = useAuth();
  const admin = isAdminOrAbove(user?.role);
  const canCreate = user?.role === "crc" || admin;
  const canSell = user?.role === "commercial" || admin;
  const { data: leads = [], loading } = useCachedQuery("leads", loadLeads);
  const { data: projects = [] } = useCachedQuery("project-options", loadProjectOptions);

  if (loading) {
    return (
      <>
        <Topbar title="Leads" subtitle="Prospects et qualification CRC" />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Leads"
        subtitle="Prospects et qualification CRC"
        actions={canCreate ? <CreateLeadButton projects={projects} /> : null}
      />

      <div className="space-y-4 p-6">
        <p className="text-sm text-white/50">
          {leads.length} lead{leads.length > 1 ? "s" : ""}
        </p>

        <section className="crm-panel overflow-visible p-0">
          {leads.length === 0 ? (
            <div className="flex min-h-[140px] items-center justify-center px-5 text-center text-sm text-white/45">
              <div>
                Aucun lead.
                {canCreate ? (
                  <div className="mt-4 flex justify-center">
                    <CreateLeadButton projects={projects} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto overflow-y-visible">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Téléphone</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">RDV</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Commentaire CRC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/leads/${lead.id}`}
                          prefetch={true}
                          className="hover:text-[#7ddea8]"
                        >
                          {lead.first_name} {lead.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">{lead.phone}</td>
                      <td className="px-4 py-3 text-[#7ddea8]">
                        {lead.projects?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {lead.next_action_at
                          ? new Date(lead.next_action_at).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {LEAD_SOURCE_LABELS[lead.source] ?? lead.source}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStatusQualify
                          leadId={lead.id}
                          projectId={lead.project_id}
                          status={lead.status}
                          projects={projects}
                          canSell={canSell}
                        />
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-white/50">
                        {lead.last_comment ?? "—"}
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
