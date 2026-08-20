import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminOrAbove } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types/database";

type Body = {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
  project_id?: string;
};

const ALLOWED_ROLES = new Set(["admin", "crc", "commercial"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim() || null;
    const password = String(body.password ?? "");
    const role = String(body.role ?? "crc") as Extract<
      UserRole,
      "admin" | "crc" | "commercial"
    >;
    const project_id = String(body.project_id ?? "").trim() || null;

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe sont obligatoires." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mot de passe : 6 caractères minimum." },
        { status: 400 }
      );
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Rôle non autorisé." }, { status: 400 });
    }
    if (role !== "admin" && !project_id) {
      return NextResponse.json(
        { error: "Assigne un projet au CRC ou au commercial." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    }

    const asUser = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user: authUser },
      error: userError,
    } = await asUser.auth.getUser(token);

    if (userError || !authUser) {
      return NextResponse.json({ error: "Session expirée." }, { status: 401 });
    }

    const { data: me } = await asUser
      .from("users")
      .select("id, role, active")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!me?.active || !isAdminOrAbove(me.role)) {
      return NextResponse.json(
        { error: "Seuls les admins peuvent créer des comptes." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
        },
      });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return NextResponse.json(
          { error: "Cet email a déjà un compte." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Compte Auth non créé." },
        { status: 500 }
      );
    }

    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await admin.from("users").insert({
        id: userId,
        email,
        full_name,
        phone,
        role,
        active: true,
      });
      if (insertErr && !insertErr.message.includes("duplicate")) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    } else {
      const { error: upErr } = await admin
        .from("users")
        .update({ full_name, phone, role, active: true })
        .eq("id", userId);
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 });
      }
    }

    if (role !== "admin" && project_id) {
      const { error: linkErr } = await admin.from("project_users").insert({
        project_id,
        user_id: userId,
        role,
      });
      if (linkErr && !linkErr.message.includes("duplicate")) {
        return NextResponse.json({ error: linkErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Création impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
