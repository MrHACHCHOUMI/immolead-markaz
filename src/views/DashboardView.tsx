"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  Calendar,
  Receipt,
  TrendingUp,
  Users,
  MapPin,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadDashboard } from "@/lib/queries";
import { isAdminOrAbove } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/utils";

export function DashboardView() {
  const { user } = useAuth();
  const admin = isAdminOrAbove(user?.role);
  const loader = useMemo(() => () => loadDashboard(admin), [admin]);
  const { data, loading } = useCachedQuery(`dashboard:${admin ? "admin" : "user"}`, loader);

  if (loading || !data) {
    return (
      <>
        <Topbar title="Dashboard" subtitle={user ? `Bienvenue ${user.full_name}` : "…"} />
        <PageSkeleton />
      </>
    );
  }

  const result = data.commissionCa - data.expensesTotal;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={user ? `Bienvenue ${user.full_name}` : ""}
        actions={
          admin ? (
            <Link href="/projets" className="crm-btn">
              Gérer les projets
            </Link>
          ) : null
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <KpiCard title="Projets" value={data.projects} />
          <KpiCard title="Leads" value={data.leads} icon={<Users className="h-4 w-4" />} />
          <KpiCard title="RDV" value={data.appointments} icon={<Calendar className="h-4 w-4" />} />
          <KpiCard title="Visiteurs" value={data.visits} icon={<MapPin className="h-4 w-4" />} />
          <KpiCard
            title="Ventes"
            value={data.salesCount}
            icon={<BadgeDollarSign className="h-4 w-4" />}
          />
          <KpiCard
            title="CA commissions"
            value={formatCurrency(data.commissionCa)}
            hint={`Volume : ${formatCurrency(data.volume)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          {admin ? (
            <KpiCard
              title="Résultat"
              value={formatCurrency(result)}
              hint={`Dépenses ${formatCurrency(data.expensesTotal)}`}
              icon={<Receipt className="h-4 w-4" />}
            />
          ) : null}
        </div>

        <section className="crm-panel p-6">
          <h3 className="text-base font-semibold text-white">Tunnel commercial</h3>
          <p className="mt-1 text-sm text-white/45">
            Leads → RDV → Visites → Ventes → CA commissions
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {[
              { label: "Leads", value: data.leads },
              { label: "RDV", value: data.appointments },
              { label: "Visites", value: data.visits },
              { label: "Ventes", value: data.salesCount },
              { label: "CA", value: formatCurrency(data.commissionCa) },
            ].map((step) => (
              <div
                key={step.label}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-[#d7b56d]">
                  {step.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{step.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
