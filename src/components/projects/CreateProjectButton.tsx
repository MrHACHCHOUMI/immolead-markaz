"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";
import { readAgencySettings } from "@/lib/agency-settings";

export function CreateProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commissionDefault, setCommissionDefault] = useState(
    () => readAgencySettings().default_commission
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setCommissionDefault(readAgencySettings().default_commission);
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

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      developer_name: String(fd.get("developer_name") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim() || null,
      description: String(fd.get("description") ?? "").trim() || null,
      commission_type: String(fd.get("commission_type") ?? "percentage"),
      commission_value: Number(fd.get("commission_value") ?? 0),
      status: String(fd.get("status") ?? "actif"),
    };

    if (!payload.name || !payload.developer_name || !payload.city) {
      setError("Nom, promoteur et ville sont obligatoires.");
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

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          ...payload,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(
          insertError.message.includes("row-level security")
            ? "Permission refusée (RLS). Ton compte doit être admin/super_admin. Exécute FIX_create_project.sql"
            : insertError.message
        );
        setLoading(false);
        return;
      }

      setOpen(false);
      router.push(`/projets/${data.id}`);
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
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

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-60">
              <div className="pointer-events-auto flex max-h-[min(90vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c16] shadow-2xl shadow-black/50">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                  <h3 className="text-base font-semibold text-white">
                    Créer un projet
                  </h3>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-3 overflow-y-auto px-5 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-white/70">
                      Nom du projet *
                      <input name="name" required className="crm-input mt-1" />
                    </label>
                    <label className="text-sm text-white/70">
                      Promoteur *
                      <input
                        name="developer_name"
                        required
                        className="crm-input mt-1"
                      />
                    </label>
                    <label className="text-sm text-white/70">
                      Ville *
                      <input name="city" required className="crm-input mt-1" />
                    </label>
                    <label className="text-sm text-white/70">
                      Adresse
                      <input name="address" className="crm-input mt-1" />
                    </label>
                  </div>

                  <label className="block text-sm text-white/70">
                    Description
                    <textarea
                      name="description"
                      rows={3}
                      className="crm-input mt-1 resize-none"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-white/70">
                      Type commission *
                      <select
                        name="commission_type"
                        required
                        className="crm-input mt-1"
                        defaultValue="percentage"
                      >
                        <option value="percentage">Pourcentage %</option>
                        <option value="fixed">Montant fixe</option>
                        <option value="custom_per_unit">Par lot</option>
                      </select>
                    </label>
                    <label className="text-sm text-white/70">
                      Valeur commission *
                      <input
                        name="commission_value"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        defaultValue={commissionDefault}
                        key={commissionDefault}
                        className="crm-input mt-1"
                      />
                    </label>
                    <label className="text-sm text-white/70 sm:col-span-2">
                      Statut
                      <select
                        name="status"
                        className="crm-input mt-1"
                        defaultValue="actif"
                      >
                        <option value="actif">Actif</option>
                        <option value="en_pause">En pause</option>
                        <option value="termine">Terminé</option>
                        <option value="archive">Archivé</option>
                      </select>
                    </label>
                  </div>

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
                      {loading ? "Création…" : "Créer le projet"}
                    </button>
                  </div>
                </form>
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
        Nouveau projet
      </button>
      {modal}
    </>
  );
}
