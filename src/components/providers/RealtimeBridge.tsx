"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";

/** Temps réel WebSocket — ne doit jamais faire planter l’app. */
export function RealtimeBridge() {
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel("crm-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "leads" },
          () => {
            invalidateCrm();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => {
            invalidateCrm();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime désactivé:", err);
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return null;
}
