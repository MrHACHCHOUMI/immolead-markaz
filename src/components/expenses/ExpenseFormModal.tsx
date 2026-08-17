"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import {
  EXPENSE_GROUP_LABELS,
  EXPENSE_KIND_LABELS,
  EXPENSE_KIND_META,
  EXPENSE_KINDS,
  encodeExpenseCategory,
  type ExpenseGroup,
  type ExpenseKind,
  type ExpenseRow,
} from "@/lib/expenses";
import type { ProjectOption } from "@/lib/queries";
import { AGENCY_EVENT, readAgencySettings } from "@/lib/agency-settings";

type Props = {
  open: boolean;
  projects: ProjectOption[];
  editing?: ExpenseRow | null;
  onClose: () => void;
};

const GROUPS: ExpenseGroup[] = ["marketing", "equipe", "agence", "terrain", "autre"];

export function ExpenseFormModal({ open, projects, editing, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ExpenseKind>("meta_ads");
  const [amountHt, setAmountHt] = useState("");
  const [amountTtc, setAmountTtc] = useState("");
  const [tva, setTva] = useState(true);
  const [tvaRate, setTvaRate] = useState(() => readAgencySettings().tva_rate);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function sync() {
      setTvaRate(readAgencySettings().tva_rate);
    }
    sync();
    window.addEventListener(AGENCY_EVENT, sync);
    return () => window.removeEventListener(AGENCY_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setKind(editing.kind);
      setAmountHt(String(editing.amount_ht || ""));
      setAmountTtc(editing.amount_ttc != null ? String(editing.amount_ttc) : "");
      setTva(editing.amount_ttc != null);
    } else {
      setKind("meta_ads");
      setAmountHt("");
      setAmountTtc("");
      setTva(true);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const kindsByGroup = useMemo(() => {
    const map: Record<ExpenseGroup, ExpenseKind[]> = {
      marketing: [],
      equipe: [],
      agence: [],
      terrain: [],
      autre: [],
    };
    for (const item of EXPENSE_KINDS) {
      map[EXPENSE_KIND_META[item].group].push(item);
    }
    return map;
  }, []);

  function applyTva(htValue: string, enabled: boolean) {
    const ht = Number(htValue);
    if (!enabled || !htValue || Number.isNaN(ht)) {
      setAmountTtc("");
      return;
    }
    const rate = readAgencySettings().tva_rate;
    setAmountTtc(String(Math.round(ht * (1 + rate / 100) * 100) / 100));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const description = String(fd.get("description") ?? "").trim();
    const project_id = String(fd.get("project_id") ?? "") || null;
    const supplier = String(fd.get("supplier") ?? "").trim() || null;
    const comment = String(fd.get("comment") ?? "").trim() || null;
    const expense_date = String(fd.get("expense_date") ?? "") || new Date().toISOString().slice(0, 10);
    const ht = Number(amountHt);
    const ttc = tva && amountTtc ? Number(amountTtc) : null;

    if (!description || !ht || ht <= 0) {
      setError("Libellé et montant HT sont obligatoires.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const encoded = encodeExpenseCategory(kind, description);
      const payload = {
        project_id,
        category: encoded.category,
        description: encoded.description,
        amount_ht: ht,
        amount_ttc: ttc,
        expense_date,
        supplier,
        comment,
        created_by: user.id,
      };

      const { error: saveErr } = editing
        ? await supabase.from("expenses").update(payload).eq("id", editing.id)
        : await supabase.from("expenses").insert(payload);

      if (saveErr) {
        setError(
          saveErr.message.includes("row-level security")
            ? "Permission refusée. Les dépenses sont réservées aux admins."
            : saveErr.message
        );
        setLoading(false);
        return;
      }

      invalidateCrm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70"
        onClick={() => !loading && onClose()}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-60">
        <div className="pointer-events-auto flex max-h-[min(92vh,860px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c16] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                {editing ? "Modifier la dépense" : "Nouvelle dépense"}
              </h3>
              <p className="mt-0.5 text-xs text-white/45">
                Charge d’agence ou rattachée à un projet
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <p className="mb-2 text-sm text-white/70">Catégorie *</p>
              <div className="space-y-3">
                {GROUPS.map((group) => (
                  <div key={group}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#d7b56d]">
                      {EXPENSE_GROUP_LABELS[group]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {kindsByGroup[group].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setKind(item)}
                          className={
                            kind === item
                              ? "rounded-full bg-[#1f8f63] px-3 py-1.5 text-xs font-medium text-white"
                              : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65 hover:text-white"
                          }
                        >
                          {EXPENSE_KIND_LABELS[item]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/35">{EXPENSE_KIND_META[kind].hint}</p>
            </div>

            <label className="block text-sm text-white/70">
              Libellé *
              <input
                name="description"
                required
                className="crm-input mt-1"
                placeholder={EXPENSE_KIND_META[kind].hint}
                defaultValue={editing?.display_description ?? ""}
                key={editing?.id ?? "new-desc"}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                Montant HT (DH) *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="crm-input mt-1"
                  value={amountHt}
                  onChange={(e) => {
                    setAmountHt(e.target.value);
                    applyTva(e.target.value, tva);
                  }}
                />
              </label>
              <label className="text-sm text-white/70">
                Date *
                <input
                  name="expense_date"
                  type="date"
                  required
                  className="crm-input mt-1"
                  defaultValue={
                    editing?.expense_date ?? new Date().toISOString().slice(0, 10)
                  }
                  key={editing?.id ?? "new-date"}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={tva}
                onChange={(e) => {
                  setTva(e.target.checked);
                  applyTva(amountHt, e.target.checked);
                }}
              />
              TVA {tvaRate} % — calculer le TTC
            </label>

            {tva ? (
              <label className="block text-sm text-white/70">
                Montant TTC (DH)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="crm-input mt-1"
                  value={amountTtc}
                  onChange={(e) => setAmountTtc(e.target.value)}
                />
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                Projet
                <select
                  name="project_id"
                  className="crm-input mt-1"
                  defaultValue={editing?.project_id ?? ""}
                  key={editing?.id ?? "new-project"}
                >
                  <option value="">Charge générale agence</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/70">
                Fournisseur
                <input
                  name="supplier"
                  className="crm-input mt-1"
                  placeholder="Meta, Imprimeur, Maroc Telecom…"
                  defaultValue={editing?.supplier ?? ""}
                  key={editing?.id ?? "new-supplier"}
                />
              </label>
            </div>

            <label className="block text-sm text-white/70">
              Commentaire
              <textarea
                name="comment"
                rows={2}
                className="crm-input mt-1 resize-none"
                placeholder="N° facture, période couverte…"
                defaultValue={editing?.comment ?? ""}
                key={editing?.id ?? "new-comment"}
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="crm-btn-ghost w-full sm:w-auto"
                disabled={loading}
                onClick={onClose}
              >
                Annuler
              </button>
              <button type="submit" className="crm-btn w-full sm:w-auto" disabled={loading}>
                {loading ? "Enregistrement…" : editing ? "Mettre à jour" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
