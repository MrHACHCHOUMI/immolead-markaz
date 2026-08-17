"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { invalidateCrm } from "@/lib/query-cache";
import { createTeamMember } from "@/lib/create-team-member";
import type { ProjectOption } from "@/lib/queries";

type Props = {
  projects: ProjectOption[];
};

export function CreateMemberButton({ projects }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "crc" | "commercial">("crc");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setRole("crc");
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
    const full_name = String(fd.get("full_name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const role = String(fd.get("role") ?? "crc") as "admin" | "crc" | "commercial";
    const project_id = String(fd.get("project_id") ?? "");

    if (!full_name || !email || !password) {
      setError("Nom, email et mot de passe sont obligatoires.");
      setLoading(false);
      return;
    }
    if (role !== "admin" && !project_id) {
      setError("Assigne un projet au CRC ou au commercial.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Mot de passe : 6 caractères minimum.");
      setLoading(false);
      return;
    }

    try {
      await createTeamMember({
        full_name,
        email,
        phone,
        password,
        role,
        project_id: role === "admin" ? undefined : project_id,
      });
      invalidateCrm();
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Création impossible";
      setError(
        message.includes("already registered")
          ? "Cet email a déjà un compte."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]">
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              onClick={() => !loading && setOpen(false)}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:left-60">
              <div className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c16] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Nouvel agent
                    </h3>
                    <p className="mt-0.5 text-xs text-white/45">
                      Admin, CRC ou commercial
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={onSubmit} className="space-y-3 px-5 py-4">
                  <label className="block text-sm text-white/70">
                    Nom complet *
                    <input name="full_name" required className="crm-input mt-1" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-white/70">
                      Email *
                      <input
                        name="email"
                        type="email"
                        required
                        className="crm-input mt-1"
                      />
                    </label>
                    <label className="text-sm text-white/70">
                      Téléphone
                      <input name="phone" className="crm-input mt-1" />
                    </label>
                  </div>
                  <label className="block text-sm text-white/70">
                    Mot de passe *
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      className="crm-input mt-1"
                      placeholder="Min. 6 caractères"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-white/70">
                      Rôle *
                      <select
                        name="role"
                        className="crm-input mt-1"
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "admin" | "crc" | "commercial")
                        }
                      >
                        <option value="crc">CRC</option>
                        <option value="commercial">Commercial</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    {role === "admin" ? (
                      <p className="self-end text-xs text-white/45">
                        Un admin voit tous les projets, sans affectation.
                      </p>
                    ) : (
                      <label className="text-sm text-white/70">
                        Projet assigné *
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
                    )}
                  </div>
                  {error ? (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="crm-btn-ghost"
                      onClick={() => setOpen(false)}
                    >
                      Annuler
                    </button>
                    <button type="submit" className="crm-btn" disabled={loading}>
                      {loading ? "Création…" : "Créer le compte"}
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
        Nouvel agent
      </button>
      {modal}
    </>
  );
}
