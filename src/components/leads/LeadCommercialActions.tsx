"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import { calculateCommissionAmount } from "@/lib/utils";
import { recordVisitFromLead } from "@/lib/record-visit";
import type { Unit } from "@/lib/types/database";

type ProjectOption = { id: string; name: string };

type Props = {
  leadId: string;
  projectId: string;
  projects: ProjectOption[];
};

export function LeadCommercialActions({
  leadId,
  projectId,
  projects,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedProject, setSelectedProject] = useState(projectId);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [comment, setComment] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!saleOpen || !selectedProject) return;
    let cancelled = false;
    setUnitsLoading(true);

    const supabase = createClient();
    void supabase
      .from("units")
      .select("*")
      .eq("project_id", selectedProject)
      .eq("status", "disponible")
      .order("reference")
      .then(({ data }) => {
        if (!cancelled) {
          setUnits((data ?? []) as Unit[]);
          setUnitsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [saleOpen, selectedProject]);

  const projectUnits = useMemo(
    () => units.filter((u) => u.project_id === selectedProject),
    [units, selectedProject]
  );

  async function qualify(
    status: "visite" | "non_visite" | "hors_budget",
    label: string
  ) {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const { error: upErr } = await supabase
        .from("leads")
        .update({ status, last_comment: comment || null })
        .eq("id", leadId);
      if (upErr) throw upErr;

      if (status === "visite" || status === "non_visite") {
        try {
          await recordVisitFromLead({
            supabase,
            userId: user.id,
            leadId,
            projectId,
            status,
            comment,
          });
        } catch (visitErr) {
          console.warn("Visite non enregistrée (table visits):", visitErr);
        }
      }

      await supabase.from("activities").insert({
        lead_id: leadId,
        project_id: projectId,
        user_id: user.id,
        activity_type: "commercial_qualification",
        description: `Qualification commerciale : ${label}${comment ? ` — ${comment}` : ""}`,
        metadata: { status },
      });

      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onSaleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");
      if (!selectedProject || !selectedUnit || !salePrice) {
        throw new Error("Projet, appartement et prix sont obligatoires");
      }

      const unit = units.find((u) => u.id === selectedUnit);
      if (!unit) throw new Error("Lot introuvable");

      const { data: project } = await supabase
        .from("projects")
        .select("commission_type, commission_value")
        .eq("id", selectedProject)
        .single();

      const commissionType =
        (unit.commission_type as "percentage" | "fixed" | "custom_per_unit") ||
        (project?.commission_type as "percentage" | "fixed" | "custom_per_unit") ||
        "percentage";
      const commissionValue = Number(
        unit.commission_value ?? project?.commission_value ?? 0
      );
      const price = Number(salePrice);
      const commissionAmount = calculateCommissionAmount(
        price,
        commissionType,
        commissionValue
      );

      const { error: saleErr } = await supabase.from("sales").insert({
        project_id: selectedProject,
        unit_id: selectedUnit,
        lead_id: leadId,
        commercial_id: user.id,
        sale_price: price,
        commission_amount: commissionAmount,
        commission_type: commissionType,
        commission_value: commissionValue,
        sale_date: new Date().toISOString().slice(0, 10),
        comment: comment || null,
        created_by: user.id,
      });
      if (saleErr) throw saleErr;

      await supabase
        .from("units")
        .update({
          status: "vendu",
          sale_price: price,
          client_lead_id: leadId,
          sold_by: user.id,
          sold_at: new Date().toISOString(),
        })
        .eq("id", selectedUnit);

      await supabase
        .from("leads")
        .update({ status: "vente", project_id: selectedProject })
        .eq("id", leadId);

      await supabase.from("activities").insert({
        lead_id: leadId,
        project_id: selectedProject,
        user_id: user.id,
        activity_type: "sale_created",
        description: `Vente — lot ${unit.reference} — ${price} DH (CA commission ${commissionAmount} DH)`,
        metadata: {
          unit_id: selectedUnit,
          sale_price: price,
          commission_amount: commissionAmount,
        },
      });

      setSaleOpen(false);
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur vente");
    } finally {
      setLoading(false);
    }
  }

  const saleModal =
    saleOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              onClick={() => setSaleOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-60">
              <form
                onSubmit={onSaleSubmit}
                className="pointer-events-auto w-full max-w-lg space-y-3 rounded-3xl border border-white/10 bg-[#0b1c16] p-5 shadow-2xl"
              >
                <h3 className="text-base font-semibold text-white">
                  Enregistrer la vente
                </h3>
                <label className="block text-sm text-white/70">
                  Projet *
                  <select
                    className="crm-input mt-1"
                    value={selectedProject}
                    onChange={(e) => {
                      setSelectedProject(e.target.value);
                      setSelectedUnit("");
                    }}
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-white/70">
                  Appartement / lot *
                  <select
                    className="crm-input mt-1"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    required
                    disabled={unitsLoading}
                  >
                    <option value="">
                      {unitsLoading ? "Chargement…" : "Choisir un bien"}
                    </option>
                    {projectUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.reference} — {Number(u.catalog_price).toLocaleString("fr-MA")} DH
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-white/70">
                  Prix de vente réel (DH) *
                  <input
                    type="number"
                    min="0"
                    required
                    className="crm-input mt-1"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </label>
                <label className="block text-sm text-white/70">
                  Commentaire
                  <textarea
                    className="crm-input mt-1 resize-none"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                {error ? (
                  <p className="text-sm text-rose-300">{error}</p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="crm-btn-ghost"
                    onClick={() => setSaleOpen(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="crm-btn" disabled={loading}>
                    {loading ? "…" : "Valider la vente"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section className="crm-panel space-y-4 p-5">
      <div>
        <h3 className="font-semibold text-white">Qualification commerciale</h3>
        <p className="mt-1 text-xs text-white/45">
          Après le RDV : Visité / Pas venu / Hors budget / Vendu
        </p>
      </div>

      <label className="block text-sm text-white/70">
        Commentaire commercial
        <textarea
          className="crm-input mt-1 resize-none"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Compte-rendu de visite…"
        />
      </label>

      {error && !saleOpen ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          className="crm-btn"
          onClick={() => qualify("visite", "Visité")}
        >
          Visité
        </button>
        <button
          type="button"
          disabled={loading}
          className="crm-btn-ghost"
          onClick={() => qualify("non_visite", "Pas venu")}
        >
          Pas venu
        </button>
        <button
          type="button"
          disabled={loading}
          className="crm-btn-ghost"
          onClick={() => qualify("hors_budget", "Hors budget")}
        >
          Hors budget
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-2xl bg-[#d7b56d] px-4 py-2.5 text-sm font-semibold text-[#071510]"
          onClick={() => setSaleOpen(true)}
        >
          Vendu
        </button>
      </div>
      {saleModal}
    </section>
  );
}
