import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppointmentStatus } from "@/lib/types/database";

type RecordVisitInput = {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  projectId: string;
  status: Extract<AppointmentStatus, "visite" | "non_visite">;
  comment?: string | null;
};

/** Crée ou met à jour la visite liée au lead — avec ou sans date de RDV. */
export async function recordVisitFromLead({
  supabase,
  userId,
  leadId,
  projectId,
  status,
  comment,
}: RecordVisitInput) {
  let pid = projectId;
  if (!pid) {
    const { data: lead } = await supabase
      .from("leads")
      .select("project_id")
      .eq("id", leadId)
      .maybeSingle();
    pid = (lead?.project_id as string | undefined) ?? "";
  }
  if (!pid) return;

  let appointmentId: string | null = null;
  const { data: appts } = await supabase
    .from("appointments")
    .select("id")
    .eq("lead_id", leadId)
    .order("appointment_date", { ascending: false })
    .limit(1);
  appointmentId = (appts?.[0]?.id as string | undefined) ?? null;

  if (appointmentId) {
    await supabase.from("appointments").update({ status }).eq("id", appointmentId);
  }

  const { data: existing } = await supabase
    .from("visits")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1);

  const existingId = existing?.[0]?.id as string | undefined;
  const payload = {
    status,
    comment: comment || null,
    commercial_id: userId,
    project_id: pid,
    appointment_id: appointmentId,
  };

  if (existingId) {
    const { error } = await supabase.from("visits").update(payload).eq("id", existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("visits").insert({
    ...payload,
    lead_id: leadId,
  });
  if (error) throw error;
}
