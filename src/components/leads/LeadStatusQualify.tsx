"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { calculateCommissionAmount } from "@/lib/utils";
import { recordVisitFromLead } from "@/lib/record-visit";
import type { LeadStatus, Unit } from "@/lib/types/database";

type ProjectOption = { id: string; name: string };

const QUALIFY_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "visite", label: "Visité" },
  { value: "non_visite", label: "Pas venu" },
  { value: "hors_budget", label: "Hors budget" },
  { value: "vente", label: "Vendu" },
];

type Props = {
  leadId: string;
  projectId: string;
  status: LeadStatus;
  projects: ProjectOption[];
};

export function LeadStatusQualify({
  leadId,
  projectId,
  status,
  projects,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState(projectId);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggleMenu() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        top: rect.bottom + 6,
        left: Math.max(12, rect.right - 180),
      });
    }
    setOpen((v) => !v);
  }

  const projectUnits = useMemo(
    () => units.filter((u) => u.project_id === selectedProject),
    [units, selectedProject]
  );

  async function applyStatus(next: LeadStatus, label: string) {
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
        .update({ status: next })
        .eq("id", leadId);
      if (upErr) throw upErr;

      if (next === "visite" || next === "non_visite") {
        try {
          await recordVisitFromLead({
            supabase,
            userId: user.id,
            leadId,
            projectId,
            status: next,
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
        description: `Qualification : ${label}`,
        metadata: { status: next },
      });

      setOpen(false);
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
        throw new Error("Projet, appartement et prix obligatoires");
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
        description: `Vente — lot ${unit.reference} — ${price} DH`,
        metadata: { unit_id: selectedUnit, sale_price: price, commission_amount: commissionAmount },
      });

      setSaleOpen(false);
      setOpen(false);
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
          <div className="fixed inset-0 z-[220]">
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
                  Vendu — assigner un bien
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
                        {u.reference} —{" "}
                        {Number(u.catalog_price).toLocaleString("fr-MA")} DH
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-white/70">
                  Prix de vente (DH) *
                  <input
                    type="number"
                    min="0"
                    required
                    className="crm-input mt-1"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </label>
                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="crm-btn-ghost"
                    onClick={() => setSaleOpen(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="crm-btn" disabled={loading}>
                    {loading ? "…" : "Valider"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        disabled={loading}
        onClick={toggleMenu}
        className="inline-flex items-center gap-1 rounded-full bg-[#1f8f63]/20 px-2.5 py-0.5 text-xs font-medium text-[#7ddea8] ring-1 ring-[#7ddea8]/20 hover:bg-[#1f8f63]/35"
      >
        {LEAD_STATUS_LABELS[status] ?? status}
        <ChevronDown className="h-3 w-3" />
      </button>
      {error ? (
        <p className="mt-1 max-w-[180px] text-[11px] text-rose-300">{error}</p>
      ) : null}

      {open && mounted
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: menuPos.top, left: menuPos.left }}
              className="fixed z-[240] w-[180px] rounded-xl border border-white/10 bg-[#0b1c16] py-1 shadow-2xl"
            >
              {QUALIFY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  className="block w-full px-3 py-2.5 text-left text-sm text-white/85 hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    if (opt.value === "vente") {
                      setSelectedProject(projectId);
                      setSelectedUnit("");
                      setSaleOpen(true);
                      setOpen(false);
                      return;
                    }
                    void applyStatus(opt.value, opt.label);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
      {saleModal}
    </div>
  );
}
