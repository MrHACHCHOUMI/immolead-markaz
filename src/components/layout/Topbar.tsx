"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

type TopbarProps = {
  title: string;
  subtitle?: string;
  userId?: string;
  actions?: React.ReactNode;
};

export function Topbar({ title, subtitle, userId, actions }: TopbarProps) {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    const supabase = createClient();

    async function load() {
      try {
        const { count: c } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid!)
          .eq("read", false);
        if (mounted) setCount(c ?? 0);
      } catch {
        // ignore
      }
    }

    const timer = window.setTimeout(() => void load(), 400);

    const channel = supabase
      .channel(`notif-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [uid]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#071510]/90 backdrop-blur">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <label className="relative hidden min-w-[240px] md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              placeholder="Rechercher…"
              className="w-full rounded-xl border border-white/10 bg-[#0b1c16] py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#7ddea8]/50"
            />
          </label>
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:bg-white/5"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1f8f63] px-1 text-[10px] font-bold text-white">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
