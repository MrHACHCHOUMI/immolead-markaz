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

/** Crée ou met à jour la visite liée au lead (avec ou sans RDV). */
export async function recordVisitFromLead({
  supabase,
  userId,
  leadId,
  projectId,
  status,
  comment,
}: RecordVisitInput) {
  const { data: appts } = await supabase
    .from("appointments")
    .select("id")
    .eq("lead_id", leadId)
    .order("appointment_date", { ascending: false })
    .limit(1);

  const appointmentId = (appts?.[0]?.id as string | undefined) ?? null;

  if (appointmentId) {
    const { error: apptErr } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);
    if (apptErr) throw apptErr;
  }

  const { data: existing } = await supabase
    .from("visits")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1);

  const existingId = existing?.[0]?.id as string | undefined;

  if (existingId) {
    const { error } = await supabase
      .from("visits")
      .update({
        status,
        comment: comment || null,
        commercial_id: userId,
        project_id: projectId,
        appointment_id: appointmentId,
      })
      .eq("id", existingId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("visits").insert({
    appointment_id: appointmentId,
    lead_id: leadId,
    project_id: projectId,
    commercial_id: userId,
    status,
    comment: comment || null,
  });
  if (error) throw error;
}
