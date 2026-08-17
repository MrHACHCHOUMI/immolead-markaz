"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient({
  initialError,
}: {
  initialError?: string | null;
}) {
  const [email, setEmail] = useState("issam@digisyma.com");
  const [password, setPassword] = useState("Issam2026!");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signError) {
        setError(
          signError.message === "fetch failed"
            ? "Impossible de joindre Supabase (réseau / SSL). Réessaie dans 2 secondes."
            : signError.message
        );
        setLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setError("Session non créée. Vérifie email / mot de passe.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        const { data: created, error: insertError } = await supabase
          .from("users")
          .insert({
            id: data.user.id,
            email: data.user.email ?? email,
            full_name: email.split("@")[0],
            role: "crc",
            active: true,
          })
          .select("*")
          .maybeSingle();
        if (insertError || !created) {
          setError(`Profil CRM: ${insertError?.message ?? "création impossible"}`);
          setLoading(false);
          return;
        }
        sessionStorage.setItem("crm-user", JSON.stringify(created));
      } else if (!profile.active) {
        await supabase.auth.signOut();
        setError("Compte désactivé.");
        setLoading(false);
        return;
      } else {
        sessionStorage.setItem("crm-user", JSON.stringify(profile));
      }

      window.location.assign("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de connexion";
      setError(
        message === "fetch failed"
          ? "Impossible de joindre Supabase (réseau / SSL)."
          : message
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#071510] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1c16] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7b56d]">
          ImmoLead × Markaz
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Connexion CRM</h1>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/75">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#071510] px-4 py-3 outline-none focus:border-[#7ddea8]/50"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-white/75">Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#071510] px-4 py-3 outline-none focus:border-[#7ddea8]/50"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#1f8f63] px-4 py-3.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
