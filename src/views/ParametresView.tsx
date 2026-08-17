"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, Shield, UserRound } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, isAdminOrAbove } from "@/lib/auth/roles";
import type { User } from "@/lib/types/database";
import {
  DEFAULT_AGENCY,
  agencyFromRow,
  readAgencySettings,
  writeAgencySettings,
  type AgencySettings,
} from "@/lib/agency-settings";

export function ParametresView() {
  const { user, refreshUser, logout } = useAuth();
  const admin = isAdminOrAbove(user?.role);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [agency, setAgency] = useState<AgencySettings>(DEFAULT_AGENCY);
  const [agencyMsg, setAgencyMsg] = useState<string | null>(null);
  const [agencyErr, setAgencyErr] = useState<string | null>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setPhone(user.phone ?? "");
  }, [user]);

  useEffect(() => {
    setAgency(readAgencySettings());
    if (!admin) return;
    const supabase = createClient();
    void supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const next = agencyFromRow(data);
        setAgency(next);
        writeAgencySettings(next);
      });
  }, [admin]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      refreshUser(data as User);
      setProfileMsg("Profil enregistré.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setProfileLoading(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPassErr(null);
    setPassMsg(null);
    if (password.length < 6) {
      setPassErr("6 caractères minimum.");
      return;
    }
    if (password !== password2) {
      setPassErr("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPassLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPassword2("");
      setPassMsg("Mot de passe mis à jour.");
    } catch (err) {
      setPassErr(err instanceof Error ? err.message : "Changement impossible");
    } finally {
      setPassLoading(false);
    }
  }

  async function saveAgency(e: FormEvent) {
    e.preventDefault();
    setAgencyLoading(true);
    setAgencyErr(null);
    setAgencyMsg(null);
    writeAgencySettings(agency);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("app_settings").upsert({
        id: 1,
        ...agency,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        const missing =
          error.code === "42P01" ||
          error.code === "PGRST205" ||
          error.message.toLowerCase().includes("does not exist");
        if (missing) {
          setAgencyMsg(
            "Enregistré sur cet appareil. Pour le partager à toute l’équipe, exécute FIX_app_settings.sql dans Supabase."
          );
        } else {
          setAgencyErr(error.message);
        }
      } else {
        setAgencyMsg("Paramètres agence enregistrés.");
      }
    } catch (err) {
      setAgencyErr(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setAgencyLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Paramètres" subtitle="Profil, sécurité et configuration agence" />

      <div className="space-y-5 p-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <form onSubmit={saveProfile} className="crm-panel space-y-3 p-5">
            <div className="flex items-center gap-2 text-[#d7b56d]">
              <UserRound className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Mon profil</h3>
            </div>
            <label className="block text-sm text-white/70">
              Nom complet
              <input
                className="crm-input mt-1"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm text-white/70">
              Téléphone
              <input
                className="crm-input mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block text-sm text-white/70">
              Email
              <input className="crm-input mt-1 opacity-70" value={user?.email ?? ""} disabled />
            </label>
            <p className="text-xs text-white/40">
              Rôle : {user ? ROLE_LABELS[user.role] : "—"}
            </p>
            {profileErr ? <p className="text-sm text-rose-300">{profileErr}</p> : null}
            {profileMsg ? <p className="text-sm text-[#7ddea8]">{profileMsg}</p> : null}
            <button type="submit" className="crm-btn" disabled={profileLoading}>
              {profileLoading ? "…" : "Enregistrer le profil"}
            </button>
          </form>

          <form onSubmit={savePassword} className="crm-panel space-y-3 p-5">
            <div className="flex items-center gap-2 text-[#d7b56d]">
              <KeyRound className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Sécurité</h3>
            </div>
            <label className="block text-sm text-white/70">
              Nouveau mot de passe
              <input
                type="password"
                className="crm-input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
            <label className="block text-sm text-white/70">
              Confirmer
              <input
                type="password"
                className="crm-input mt-1"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                minLength={6}
                required
              />
            </label>
            {passErr ? <p className="text-sm text-rose-300">{passErr}</p> : null}
            {passMsg ? <p className="text-sm text-[#7ddea8]">{passMsg}</p> : null}
            <button type="submit" className="crm-btn" disabled={passLoading}>
              {passLoading ? "…" : "Changer le mot de passe"}
            </button>
          </form>
        </div>

        {admin ? (
          <form onSubmit={saveAgency} className="crm-panel space-y-4 p-5">
            <div className="flex items-center gap-2 text-[#d7b56d]">
              <Building2 className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Agence</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/70">
                Nom affiché
                <input
                  className="crm-input mt-1"
                  value={agency.agency_name}
                  onChange={(e) => setAgency({ ...agency, agency_name: e.target.value })}
                  required
                />
              </label>
              <label className="text-sm text-white/70">
                Sous-titre
                <input
                  className="crm-input mt-1"
                  value={agency.tagline}
                  onChange={(e) => setAgency({ ...agency, tagline: e.target.value })}
                />
              </label>
              <label className="text-sm text-white/70">
                Ville
                <input
                  className="crm-input mt-1"
                  value={agency.city}
                  onChange={(e) => setAgency({ ...agency, city: e.target.value })}
                />
              </label>
              <label className="text-sm text-white/70">
                Téléphone agence
                <input
                  className="crm-input mt-1"
                  value={agency.phone}
                  onChange={(e) => setAgency({ ...agency, phone: e.target.value })}
                />
              </label>
              <label className="text-sm text-white/70 sm:col-span-2">
                Email agence
                <input
                  type="email"
                  className="crm-input mt-1"
                  value={agency.email}
                  onChange={(e) => setAgency({ ...agency, email: e.target.value })}
                />
              </label>
              <label className="text-sm text-white/70">
                TVA par défaut (%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="crm-input mt-1"
                  value={agency.tva_rate}
                  onChange={(e) =>
                    setAgency({ ...agency, tva_rate: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm text-white/70">
                Commission projet par défaut (%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="crm-input mt-1"
                  value={agency.default_commission}
                  onChange={(e) =>
                    setAgency({ ...agency, default_commission: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            {agencyErr ? <p className="text-sm text-rose-300">{agencyErr}</p> : null}
            {agencyMsg ? <p className="text-sm text-[#7ddea8]">{agencyMsg}</p> : null}
            <button type="submit" className="crm-btn" disabled={agencyLoading}>
              {agencyLoading ? "…" : "Enregistrer l’agence"}
            </button>
          </form>
        ) : null}

        {admin ? (
          <section className="crm-panel p-5">
            <div className="flex items-center gap-2 text-[#d7b56d]">
              <Shield className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Accès</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                <span className="text-white">CRC</span> — leads, visites, projet assigné, biens,
                commentaires. Pas de ventes ni dépenses.
              </li>
              <li>
                <span className="text-white">Commercial</span> — leads, visites, projet, biens,
                ventes.
              </li>
              <li>
                <span className="text-white">Admin</span> — tout le CRM, équipe, rapports,
                dépenses.
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/equipe" className="crm-btn">
                Gérer l’équipe
              </Link>
              <Link href="/rapports" className="crm-btn-ghost">
                Voir les rapports
              </Link>
            </div>
          </section>
        ) : null}

        <div className="flex justify-end">
          <button type="button" className="crm-btn-ghost" onClick={() => void logout()}>
            Déconnexion
          </button>
        </div>
      </div>
    </>
  );
}
