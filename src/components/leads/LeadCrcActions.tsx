"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";

type Props = {
  leadId: string;
  projectId: string;
};

export function LeadCrcActions({ leadId, projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvTime, setRdvTime] = useState("");
  const [callResult, setCallResult] = useState("reponse");
  const [callComment, setCallComment] = useState("");

  async function saveRdv(e: FormEvent) {
    e.preventDefault();
    if (!rdvDate || !rdvTime) {
      setError("Date et heure du RDV obligatoires");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const appointmentDate = new Date(`${rdvDate}T${rdvTime}:00`).toISOString();

      const { error: apptErr } = await supabase.from("appointments").insert({
        lead_id: leadId,
        project_id: projectId,
        crc_id: user.id,
        appointment_date: appointmentDate,
        status: "planifie",
        comment: callComment || null,
      });
      if (apptErr) throw apptErr;

      await supabase
        .from("leads")
        .update({
          status: "rdv_pris",
          next_action_at: appointmentDate,
        })
        .eq("id", leadId);

      await supabase.from("activities").insert({
        lead_id: leadId,
        project_id: projectId,
        user_id: user.id,
        activity_type: "appointment_created",
        description: `RDV CRC planifié le ${rdvDate} à ${rdvTime}`,
        metadata: { appointment_date: appointmentDate },
      });

      setRdvDate("");
      setRdvTime("");
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur RDV");
    } finally {
      setLoading(false);
    }
  }

  async function saveCall(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const { error: callErr } = await supabase.from("lead_calls").insert({
        lead_id: leadId,
        crc_id: user.id,
        call_date: new Date().toISOString(),
        result: callResult,
        comment: callComment || null,
      });
      if (callErr) throw callErr;

      await supabase
        .from("leads")
        .update({
          last_comment: callComment || null,
          status:
            callResult === "pas_de_reponse" || callResult === "telephone_eteint"
              ? "pas_de_reponse"
              : callResult === "rappeler"
                ? "rappel"
                : callResult === "rdv_obtenu"
                  ? "rdv_pris"
                  : "qualifie",
        })
        .eq("id", leadId);

      await supabase.from("activities").insert({
        lead_id: leadId,
        project_id: projectId,
        user_id: user.id,
        activity_type: "crc_call",
        description: `Appel CRC — ${callResult}${callComment ? ` : ${callComment}` : ""}`,
        metadata: { result: callResult },
      });

      setCallComment("");
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur appel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={saveCall} className="crm-panel space-y-3 p-5">
        <h3 className="font-semibold text-white">Appel CRC</h3>
        <label className="block text-sm text-white/70">
          Résultat
          <select
            className="crm-input mt-1"
            value={callResult}
            onChange={(e) => setCallResult(e.target.value)}
          >
            <option value="reponse">Réponse</option>
            <option value="pas_de_reponse">Pas de réponse</option>
            <option value="telephone_eteint">Téléphone éteint</option>
            <option value="mauvais_numero">Mauvais numéro</option>
            <option value="rappeler">Rappeler</option>
            <option value="interesse">Intéressé</option>
            <option value="non_interesse">Non intéressé</option>
            <option value="rdv_obtenu">RDV obtenu</option>
          </select>
        </label>
        <label className="block text-sm text-white/70">
          Commentaire d’appel
          <textarea
            className="crm-input mt-1 resize-none"
            rows={3}
            value={callComment}
            onChange={(e) => setCallComment(e.target.value)}
            placeholder="Compte-rendu CRC…"
          />
        </label>
        <button type="submit" className="crm-btn" disabled={loading}>
          Enregistrer l’appel
        </button>
      </form>

      <form onSubmit={saveRdv} className="crm-panel space-y-3 p-5">
        <h3 className="font-semibold text-white">Planifier un RDV</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-white/70">
            Date *
            <input
              type="date"
              required
              className="crm-input mt-1"
              value={rdvDate}
              onChange={(e) => setRdvDate(e.target.value)}
            />
          </label>
          <label className="text-sm text-white/70">
            Heure *
            <input
              type="time"
              required
              className="crm-input mt-1"
              value={rdvTime}
              onChange={(e) => setRdvTime(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className="crm-btn" disabled={loading}>
          Créer le RDV
        </button>
      </form>

      {error ? (
        <p className="text-sm text-rose-300 lg:col-span-2">{error}</p>
      ) : null}
    </section>
  );
}
