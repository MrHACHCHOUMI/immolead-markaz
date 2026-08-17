"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateCrm } from "@/lib/query-cache";

type RealtimeTable =
  | "notifications"
  | "leads"
  | "appointments"
  | "visits"
  | "sales"
  | "units";

/**
 * Abonnement WebSocket Supabase Realtime — refresh auto dès qu’une ligne change.
 */
export function useRealtimeRefresh(
  tables: RealtimeTable[],
  filter?: string
) {
  const tablesKey = tables.join(",");

  useEffect(() => {
    const list = tablesKey.split(",") as RealtimeTable[];
    const supabase = createClient();
    const channel = supabase.channel(`crm-rt-${tablesKey}`);

    for (const table of list) {
      const opts: {
        event: "*";
        schema: "public";
        table: string;
        filter?: string;
      } = { event: "*", schema: "public", table };
      if (filter) opts.filter = filter;

      channel.on(
        "postgres_changes",
        opts,
        () => {
          invalidateCrm();
        }
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tablesKey, filter]);
}

export function useUnreadNotifications(userId: string) {
  const [count, setCount] = useState(0);
  const [latestTitle, setLatestTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    async function load() {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      setCount(c ?? 0);
    }

    void load();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void load();
          if (payload.eventType === "INSERT") {
            const row = payload.new as { title?: string };
            setLatestTitle(row.title ?? "Nouvelle notification");
            window.setTimeout(() => setLatestTitle(null), 3500);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { count, latestTitle };
}
