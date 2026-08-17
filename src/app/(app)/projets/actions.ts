"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { isAdminOrAbove } from "@/lib/auth/roles";
import type { CommissionType, PropertyType, ProjectStatus } from "@/lib/types/database";

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  if (!isAdminOrAbove(user.role)) {
    redirect("/projets?error=" + encodeURIComponent("Permission refusée"));
  }

  const name = String(formData.get("name") ?? "").trim();
  const developer_name = String(formData.get("developer_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const commission_type = String(
    formData.get("commission_type") ?? "percentage"
  ) as CommissionType;
  const commission_value = Number(formData.get("commission_value") ?? 0);
  const status = String(formData.get("status") ?? "actif") as ProjectStatus;

  if (!name || !developer_name || !city) {
    redirect("/projets?error=" + encodeURIComponent("Champs obligatoires manquants"));
  }

  if (!commission_type || Number.isNaN(commission_value) || commission_value < 0) {
    redirect("/projets?error=" + encodeURIComponent("Commission invalide"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      developer_name,
      city,
      address,
      description,
      commission_type,
      commission_value,
      status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      "/projets?error=" + encodeURIComponent(error?.message ?? "Création échouée")
    );
  }

  revalidatePath("/projets");
  revalidatePath("/biens");
  revalidatePath("/disponibilites");
  redirect(`/projets/${data.id}`);
}

export async function createUnitAction(formData: FormData) {
  const user = await requireUser();
  if (!isAdminOrAbove(user.role)) {
    redirect("/biens?error=" + encodeURIComponent("Permission refusée"));
  }

  const project_id = String(formData.get("project_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const property_type = String(
    formData.get("property_type") ?? "appartement"
  ) as PropertyType;
  const floor = String(formData.get("floor") ?? "").trim() || null;
  const surfaceRaw = String(formData.get("surface") ?? "").trim();
  const bedroomsRaw = String(formData.get("bedrooms") ?? "").trim();
  const catalog_price = Number(formData.get("catalog_price") ?? 0);
  const commission_type_raw = String(formData.get("commission_type") ?? "");
  const commission_value_raw = String(formData.get("commission_value") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/biens");

  if (!project_id || !reference || Number.isNaN(catalog_price) || catalog_price < 0) {
    redirect(
      `${redirectTo}?error=` + encodeURIComponent("Projet, référence et prix requis")
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    project_id,
    reference,
    property_type,
    floor,
    surface: surfaceRaw ? Number(surfaceRaw) : null,
    bedrooms: bedroomsRaw ? Number(bedroomsRaw) : null,
    catalog_price,
    commission_type: commission_type_raw
      ? (commission_type_raw as CommissionType)
      : null,
    commission_value: commission_value_raw
      ? Number(commission_value_raw)
      : null,
    status: "disponible",
  });

  if (error) {
    redirect(`${redirectTo}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath(`/projets/${project_id}`);
  revalidatePath("/projets");
  revalidatePath("/biens");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/biens");
}
