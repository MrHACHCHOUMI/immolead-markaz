import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types/database";

/** Lecture cookie locale + 1 requête profil — pas d’appel Auth réseau. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUser = session?.user;
    if (!authUser) return null;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (data) return data as User;

    const { data: created, error: createError } = await supabase
      .from("users")
      .upsert(
        {
          id: authUser.id,
          email: authUser.email ?? `${authUser.id}@local`,
          full_name:
            (authUser.user_metadata?.full_name as string | undefined) ||
            authUser.email?.split("@")[0] ||
            "Utilisateur",
          role: "crc",
          active: true,
        },
        { onConflict: "id" }
      )
      .select("*")
      .maybeSingle();

    if (createError) {
      console.error("Profil CRM:", createError.message);
      return null;
    }

    return (created as User) ?? null;
  } catch (err) {
    console.error("getCurrentUser:", err);
    return null;
  }
});

export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!user.active) redirect("/login?reason=inactive");

  return user;
});
