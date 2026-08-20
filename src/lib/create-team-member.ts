import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";

type CreateMemberInput = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role: Extract<UserRole, "admin" | "crc" | "commercial">;
  project_id?: string;
};

export async function createTeamMember(input: CreateMemberInput) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session expirée. Reconnecte-toi.");
  }

  const res = await fetch("/api/team/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      password: input.password,
      role: input.role,
      project_id: input.project_id,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload.error || "Création impossible");
  }
  if (!payload.id) {
    throw new Error("Compte créé sans identifiant.");
  }
  return payload.id;
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
