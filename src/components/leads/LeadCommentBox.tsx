"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";

type Props = {
  leadId: string;
  projectId: string;
};

export function LeadCommentBox({ leadId, projectId }: Props) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const { error: upErr } = await supabase
        .from("leads")
        .update({ last_comment: comment.trim() })
        .eq("id", leadId);
      if (upErr) throw upErr;

      await supabase.from("activities").insert({
        lead_id: leadId,
        project_id: projectId,
        user_id: user.id,
        activity_type: "comment",
        description: comment.trim(),
        metadata: {},
      });

      setComment("");
      invalidateCrm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur commentaire");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="crm-panel space-y-3 p-5">
      <h3 className="font-semibold text-white">Commentaire</h3>
      <textarea
        className="crm-input resize-none"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Compte-rendu, budget, prochaine action…"
      />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button type="submit" className="crm-btn" disabled={loading || !comment.trim()}>
        {loading ? "…" : "Enregistrer le commentaire"}
      </button>
    </form>
  );
}
