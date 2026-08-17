"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { LeadCrcActions } from "@/components/leads/LeadCrcActions";
import { LeadCommercialActions } from "@/components/leads/LeadCommercialActions";
import { LeadStatusQualify } from "@/components/leads/LeadStatusQualify";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadLeads, loadProjectOptions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import {
  APPOINTMENT_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from "@/lib/labels";
import type { Activity, Appointment, LeadCall } from "@/lib/types/database";

export function LeadDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data: leads = [], loading } = useCachedQuery("leads", loadLeads);
  const { data: projects = [] } = useCachedQuery("project-options", loadProjectOptions);

  const extraLoader = useMemo(
    () => async () => {
      const supabase = createClient();
      const [activities, calls, appointments] = await Promise.all([
        supabase
          .from("activities")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("lead_calls")
          .select("*")
          .eq("lead_id", id)
          .order("call_date", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .eq("lead_id", id)
          .order("appointment_date", { ascending: true }),
      ]);
      return {
        activities: (activities.data ?? []) as Activity[],
        calls: (calls.data ?? []) as LeadCall[],
        appointments: (appointments.data ?? []) as Appointment[],
      };
    },
    [id]
  );

  const { data: extra } = useCachedQuery(`lead-extra:${id}`, extraLoader);

  const lead = leads.find((l) => l.id === id);
  const activities = extra?.activities ?? [];
  const calls = extra?.calls ?? [];
  const appointments = extra?.appointments ?? [];
  const nextRdv = appointments.find(
    (a) => a.status === "planifie" || a.status === "confirme"
  );

  if (loading && !lead) {
    return (
      <>
        <Topbar title="Lead" />
        <PageSkeleton />
      </>
    );
  }

  if (!lead) {
    return (
      <>
        <Topbar title="Lead introuvable" />
        <div className="p-6 text-sm text-white/50">Ce lead n’existe pas.</div>
      </>
    );
  }

  return (
    <>
      <Topbar title={`${lead.first_name} ${lead.last_name}`} subtitle={lead.phone} />

      <div className="space-y-6 p-6">
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#7ddea8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux leads
        </Link>

        <section className="crm-panel p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1 text-xs text-white/45">Statut</p>
              <LeadStatusQualify
                leadId={lead.id}
                projectId={lead.project_id}
                status={lead.status}
                projects={projects}
              />
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">
              {LEAD_SOURCE_LABELS[lead.source]}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
            <p>
              <span className="text-white/40">Projet : </span>
              {lead.projects?.name ?? "—"}
            </p>
            <p>
              <span className="text-white/40">Email : </span>
              {lead.email ?? "—"}
            </p>
            <p className="sm:col-span-2">
              <span className="text-white/40">Commentaire CRC : </span>
              {lead.last_comment ?? "—"}
            </p>
            <p className="sm:col-span-2 text-[#d7b56d]">
              <span className="text-white/40">Prochain RDV : </span>
              {nextRdv
                ? new Date(nextRdv.appointment_date).toLocaleString("fr-FR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })
                : "Non planifié"}
            </p>
          </div>
        </section>

        <section className="crm-panel p-5">
          <h3 className="font-semibold text-white">Rendez-vous</h3>
          {appointments.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Aucun RDV.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-white">
                    {new Date(a.appointment_date).toLocaleString("fr-FR")}
                  </span>
                  <span className="rounded-full bg-[#1f8f63]/15 px-2.5 py-0.5 text-xs text-[#7ddea8]">
                    {APPOINTMENT_STATUS_LABELS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="crm-panel p-5">
          <h3 className="font-semibold text-white">Commentaires / appels CRC</h3>
          {calls.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Aucun appel enregistré.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {calls.map((c, index) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#d7b56d]">
                      Call {calls.length - index} —{" "}
                      {new Date(c.call_date).toLocaleString("fr-FR")}
                    </p>
                    <span className="text-xs text-white/50">{c.result}</span>
                  </div>
                  <p className="mt-1 text-sm text-white">
                    {c.comment || "Sans commentaire"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <LeadCrcActions leadId={lead.id} projectId={lead.project_id} />
        <LeadCommercialActions
          leadId={lead.id}
          projectId={lead.project_id}
          projects={projects}
        />

        <section className="crm-panel p-5">
          <h3 className="font-semibold text-white">Timeline complète</h3>
          {activities.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Aucune activité.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-xs text-[#d7b56d]">
                    {new Date(a.created_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-1 text-sm text-white">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
