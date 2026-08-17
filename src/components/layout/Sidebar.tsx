"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  MapPin,
  Home,
  BadgeDollarSign,
  Receipt,
  Wallet,
  UserCog,
  BarChart3,
  Settings,
  Phone,
  ClipboardList,
  UserRound,
  LogOut,
} from "lucide-react";
import { getNavForRole, ROLE_LABELS, type NavItem } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { prefetchNav } from "@/lib/queries";

const ICONS: Record<NavItem["icon"], typeof LayoutDashboard> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  users: Users,
  "map-pin": MapPin,
  home: Home,
  "badge-dollar-sign": BadgeDollarSign,
  receipt: Receipt,
  wallet: Wallet,
  "user-cog": UserCog,
  "bar-chart-3": BarChart3,
  settings: Settings,
  phone: Phone,
  "clipboard-list": ClipboardList,
  "user-round": UserRound,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [clicked, setClicked] = useState<string | null>(null);

  useEffect(() => {
    setClicked(null);
  }, [pathname]);

  const items = user ? getNavForRole(user.role) : getNavForRole("super_admin");

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#071510]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7b56d]">
          ImmoLead × Markaz
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">CRM Commercial</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => prefetchNav(item.href)}
              onClick={() => setClicked(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                active || clicked === item.href
                  ? "bg-[#1f8f63] text-white shadow-lg shadow-emerald-950/40"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">
          {user?.full_name ?? "…"}
        </p>
        <p className="text-xs text-[#d7b56d]">
          {user ? ROLE_LABELS[user.role] : "Chargement"}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
