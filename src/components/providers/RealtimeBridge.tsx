"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
            // soft refresh
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("crm:realtime"));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("crm:realtime"));
            }
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
