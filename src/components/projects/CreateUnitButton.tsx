"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { createUnitAction } from "@/app/(app)/projets/actions";

export type ProjectOption = { id: string; name: string };

type Props = {
  projects: ProjectOption[];
  defaultProjectId?: string;
  redirectTo?: string;
  label?: string;
};

export function CreateUnitButton({
  projects,
  defaultProjectId,
  redirectTo = "/biens",
  label = "Ajouter un bien",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-60">
              <div className="pointer-events-auto flex max-h-[min(90vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c16] shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                  <h3 className="text-base font-semibold text-white">
                    Ajouter un bien
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-y-auto">
                  {!projects.length ? (
                    <div className="space-y-4 px-5 py-6 text-sm text-white/70">
                      <p>Crée d’abord un projet, puis assigne le bien.</p>
                      <Link href="/projets" className="crm-btn inline-flex">
                        Aller aux projets
                      </Link>
                    </div>
                  ) : (
                    <form
                      action={createUnitAction}
                      className="space-y-3 px-5 py-4"
                    >
                      <input type="hidden" name="redirect_to" value={redirectTo} />

                      <label className="block text-sm text-white/70">
                        Assigner au projet *
                        {defaultProjectId ? (
                          <>
                            <input
                              type="hidden"
                              name="project_id"
                              value={defaultProjectId}
                            />
                            <input
                              className="crm-input mt-1"
                              disabled
                              value={
                                projects.find((p) => p.id === defaultProjectId)
                                  ?.name ?? "Projet"
                              }
                            />
                          </>
                        ) : (
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
                        )}
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm text-white/70">
                          Référence *
                          <input
                            name="reference"
                            required
                            placeholder="A12 / Villa 3…"
                            className="crm-input mt-1"
                          />
                        </label>
                        <label className="text-sm text-white/70">
                          Type *
                          <select
                            name="property_type"
                            className="crm-input mt-1"
                            defaultValue="appartement"
                          >
                            <option value="appartement">Appartement</option>
                            <option value="villa">Villa</option>
                            <option value="commerce">Magasin / Commerce</option>
                            <option value="studio">Studio</option>
                            <option value="duplex">Duplex</option>
                            <option value="bureau">Bureau</option>
                            <option value="terrain">Terrain / Lot</option>
                            <option value="autre">Autre</option>
                          </select>
                        </label>
                        <label className="text-sm text-white/70">
                          Étage
                          <input name="floor" className="crm-input mt-1" />
                        </label>
                        <label className="text-sm text-white/70">
                          Superficie (m²)
                          <input
                            name="surface"
                            type="number"
                            step="0.01"
                            className="crm-input mt-1"
                          />
                        </label>
                        <label className="text-sm text-white/70">
                          Chambres
                          <input
                            name="bedrooms"
                            type="number"
                            className="crm-input mt-1"
                          />
                        </label>
                        <label className="text-sm text-white/70">
                          Prix (DH) *
                          <input
                            name="catalog_price"
                            type="number"
                            min="0"
                            step="1"
                            required
                            className="crm-input mt-1"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="crm-btn-ghost w-full sm:w-auto"
                          onClick={() => setOpen(false)}
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="crm-btn w-full sm:w-auto"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  )}
                </div>
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
        {label}
      </button>
      {modal}
    </>
  );
}
