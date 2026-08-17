import { createClient as createAuthClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";

type CreateMemberInput = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role: Extract<UserRole, "crc" | "commercial">;
  project_id: string;
};

export async function createTeamMember(input: CreateMemberInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase manquante.");

  const isolated = createAuthClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await isolated.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        role: input.role,
      },
    },
  });

  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) {
    throw new Error(
      "Compte créé, mais confirmation email requise. Désactive « Confirm email » dans Supabase Auth."
    );
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await supabase.from("users").insert({
      id: userId,
      email: input.email.trim().toLowerCase(),
      full_name: input.full_name,
      phone: input.phone || null,
      role: input.role,
      active: true,
    });
    if (insertErr && !insertErr.message.includes("duplicate")) throw insertErr;
  } else {
    const { error: upErr } = await supabase
      .from("users")
      .update({
        full_name: input.full_name,
        phone: input.phone || null,
        role: input.role,
        active: true,
      })
      .eq("id", userId);
    if (upErr) throw upErr;
  }

  const { error: linkErr } = await supabase.from("project_users").insert({
    project_id: input.project_id,
    user_id: userId,
    role: input.role,
  });
  if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;

  return userId;
}

export async function assignMemberProject(
  userId: string,
  projectId: string,
  role: UserRole
) {
  const supabase = createClient();
  const { error } = await supabase.from("project_users").insert({
    project_id: projectId,
    user_id: userId,
    role,
  });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function setMemberActive(userId: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("users").update({ active }).eq("id", userId);
  if (error) throw error;
}
