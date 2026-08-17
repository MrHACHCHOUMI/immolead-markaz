"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import { recordVisitFromLead } from "@/lib/record-visit";

export type ProjectOption = { id: string; name: string };

export function CreateLeadButton({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const first_name = String(fd.get("first_name") ?? "").trim();
    const last_name = String(fd.get("last_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim() || null;
    const project_id = String(fd.get("project_id") ?? "");
    const source = String(fd.get("source") ?? "autre");
    const status = String(fd.get("status") ?? "nouveau");
    const last_comment = String(fd.get("last_comment") ?? "").trim() || null;
    const rdv_date = String(fd.get("rdv_date") ?? "").trim();
    const rdv_time = String(fd.get("rdv_time") ?? "").trim();

    if (!first_name || !last_name || !phone || !project_id) {
      setError("Prénom, nom, téléphone et projet sont obligatoires.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Session expirée. Reconnecte-toi.");
        setLoading(false);
        return;
      }

      const hasRdv = Boolean(rdv_date && rdv_time);
      const leadStatus = hasRdv ? "rdv_pris" : status;

      const { data: lead, error: insertError } = await supabase
        .from("leads")
        .insert({
          first_name,
          last_name,
          phone,
          email,
          project_id,
          source,
          status: leadStatus,
          last_comment,
          assigned_crc_id: user.id,
          created_by: user.id,
          next_action_at: hasRdv
            ? new Date(`${rdv_date}T${rdv_time}:00`).toISOString()
            : null,
        })
        .select("id")
        .single();

      if (insertError || !lead) {
        setError(
          insertError?.message.includes("row-level security")
            ? "Permission refusée. Vérifie ton rôle (admin/CRC)."
            : insertError?.message ?? "Création échouée"
        );
        setLoading(false);
        return;
      }

      await supabase.from("activities").insert({
        lead_id: lead.id,
        project_id,
        user_id: user.id,
        activity_type: "lead_created",
        description: `Lead créé — source ${source}`,
        metadata: { status: leadStatus, phone },
      });

      if (hasRdv) {
        const appointmentDate = new Date(
          `${rdv_date}T${rdv_time}:00`
        ).toISOString();

        const { error: rdvError } = await supabase.from("appointments").insert({
          lead_id: lead.id,
          project_id,
          crc_id: user.id,
          appointment_date: appointmentDate,
          status: "planifie",
          comment: last_comment,
        });

        if (rdvError) {
          setError(`Lead créé, mais RDV échoué: ${rdvError.message}`);
          setLoading(false);
          invalidateCrm();
          return;
        }

        await supabase.from("activities").insert({
          lead_id: lead.id,
          project_id,
          user_id: user.id,
          activity_type: "appointment_created",
          description: `RDV planifié le ${rdv_date} à ${rdv_time}`,
          metadata: { appointment_date: appointmentDate },
        });
      } else if (leadStatus === "visite" || leadStatus === "non_visite") {
        try {
          await recordVisitFromLead({
            supabase,
            userId: user.id,
            leadId: lead.id,
            projectId: project_id,
            status: leadStatus,
            comment: last_comment,
          });
        } catch (visitErr) {
          console.warn("Visite non enregistrée (table visits):", visitErr);
        }
      }

      setOpen(false);
      router.push(`/leads/${lead.id}`);
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 bg-black/70"
              onClick={() => !loading && setOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-64">
              <div className="pointer-events-auto flex max-h-[min(90vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c16] shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                  <h3 className="text-base font-semibold text-white">
                    Nouveau lead
                  </h3>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {!projects.length ? (
                  <div className="space-y-4 px-5 py-6 text-sm text-white/70">
                    <p>Crée d’abord un projet pour rattacher le lead.</p>
                    <Link href="/projets" className="crm-btn inline-flex">
                      Aller aux projets
                    </Link>
                  </div>
                ) : (
                  <form
                    onSubmit={onSubmit}
                    className="space-y-3 overflow-y-auto px-5 py-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-white/70">
                        Prénom *
                        <input
                          name="first_name"
                          required
                          className="crm-input mt-1"
                        />
                      </label>
                      <label className="text-sm text-white/70">
                        Nom *
                        <input
                          name="last_name"
                          required
                          className="crm-input mt-1"
                        />
                      </label>
                      <label className="text-sm text-white/70">
                        Téléphone *
                        <input
                          name="phone"
                          required
                          placeholder="06XXXXXXXX"
                          className="crm-input mt-1"
                        />
                      </label>
                      <label className="text-sm text-white/70">
                        Email
                        <input
                          name="email"
                          type="email"
                          className="crm-input mt-1"
                        />
                      </label>
                    </div>

                    <label className="block text-sm text-white/70">
                      Projet *
                      <select
                        name="project_id"
                        required
                        className="crm-input mt-1"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choisir un projet
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-white/70">
                        Source
                        <select
                          name="source"
                          className="crm-input mt-1"
                          defaultValue="meta_ads"
                        >
                          <option value="meta_ads">Meta Ads</option>
                          <option value="google_ads">Google Ads</option>
                          <option value="landing_page">Landing Page</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="telephone">Téléphone</option>
                          <option value="organique">Organique</option>
                          <option value="recommandation">Recommandation</option>
                          <option value="salon">Salon</option>
                          <option value="autre">Autre</option>
                        </select>
                      </label>
                      <label className="text-sm text-white/70">
                        Statut
                        <select
                          name="status"
                          className="crm-input mt-1"
                          defaultValue="nouveau"
                        >
                          <option value="nouveau">Nouveau</option>
                          <option value="a_appeler">À appeler</option>
                          <option value="rappel">Rappel</option>
                          <option value="qualifie">Qualifié</option>
                          <option value="visite">Visité</option>
                          <option value="non_visite">Pas venu</option>
                          <option value="non_qualifie">Non qualifié</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-white/70">
                        Date du RDV
                        <input
                          name="rdv_date"
                          type="date"
                          className="crm-input mt-1"
                        />
                      </label>
                      <label className="text-sm text-white/70">
                        Heure du RDV
                        <input
                          name="rdv_time"
                          type="time"
                          className="crm-input mt-1"
                        />
                      </label>
                    </div>

                    <label className="block text-sm text-white/70">
                      Commentaire CRC
                      <textarea
                        name="last_comment"
                        rows={3}
                        className="crm-input mt-1 resize-none"
                        placeholder="Budget, typologie recherchée…"
                      />
                    </label>

                    {error ? (
                      <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                        {error}
                      </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        className="crm-btn-ghost w-full sm:w-auto"
                        disabled={loading}
                        onClick={() => setOpen(false)}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="crm-btn w-full sm:w-auto"
                        disabled={loading}
                      >
                        {loading ? "Création…" : "Créer le lead"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button type="button" className="crm-btn" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nouveau lead
      </button>
      {modal}
    </>
  );
}
