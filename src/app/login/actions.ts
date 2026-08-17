"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email et mot de passe requis."));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(
      "/login?error=" +
        encodeURIComponent(error?.message ?? "Identifiants invalides.")
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      email: data.user.email ?? email,
      full_name:
        (data.user.user_metadata?.full_name as string | undefined) ||
        email.split("@")[0],
      role: "crc",
      active: true,
    });

    if (insertError) {
      const { data: byEmail } = await supabase
        .from("users")
        .select("id, active")
        .eq("email", email)
        .maybeSingle();

      if (!byEmail) {
        redirect(
          "/login?error=" +
            encodeURIComponent(
              `Profil CRM: ${insertError.message}. Exécute FIX_login_final.sql`
            )
        );
      }
    }
  } else if (!profile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Compte désactivé."));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
