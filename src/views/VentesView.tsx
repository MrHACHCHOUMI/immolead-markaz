"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BadgeDollarSign, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { loadSales } from "@/lib/queries";
import { formatCurrency, fullName } from "@/lib/utils";

export function VentesView() {
  const { user } = useAuth();
  const { data: sales = [], loading, error } = useCachedQuery("sales", loadSales);
  const commercialView = user?.role === "commercial";

  const totals = useMemo(() => {
    const volume = sales.reduce((sum, sale) => sum + Number(sale.sale_price), 0);
    const commission = sales.reduce(
      (sum, sale) => sum + Number(sale.commission_amount),
      0
    );
    return { volume, commission };
  }, [sales]);

  if (loading) {
    return (
      <>
        <Topbar
          title={commercialView ? "Mes ventes" : "Ventes"}
          subtitle="Prix, commissions, projet, client et commercial"
        />
        <PageSkeleton />
      </>
    );
  }

  return (
    <>
      <Topbar
        title={commercialView ? "Mes ventes" : "Ventes"}
        subtitle="Prix, commissions, projet, client et commercial"
      />

      <div className="space-y-4 p-6">
        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            title="Ventes"
            value={sales.length}
            icon={<BadgeDollarSign className="h-4 w-4" />}
          />
          <KpiCard title="Volume" value={formatCurrency(totals.volume)} />
          <KpiCard
            title="Commissions"
            value={formatCurrency(totals.commission)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <section className="crm-panel overflow-visible p-0">
          {sales.length === 0 ? (
            <div className="flex min-h-[140px] items-center justify-center px-5 text-center text-sm text-white/45">
              Aucune vente pour le moment.
              <br />
              Marque un lead « Vendu » depuis Leads pour l’afficher ici.
            </div>
          ) : (
            <div className="crm-table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Lot</th>
                    <th className="px-4 py-3 font-medium">Prix</th>
                    <th className="px-4 py-3 font-medium">Commission</th>
                    <th className="px-4 py-3 font-medium">Commercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sales.map((sale) => {
                    const client = sale.leads
                      ? fullName(sale.leads.first_name, sale.leads.last_name)
                      : "—";
                    const commissionHint =
                      sale.commission_type === "percentage"
                        ? `${sale.commission_value} %`
                        : null;

                    return (
                      <tr key={sale.id} className="hover:bg-white/[0.03]">
                        <td className="whitespace-nowrap px-4 py-3 text-white/70">
                          {sale.sale_date
                            ? new Date(`${sale.sale_date}T12:00:00`).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">
                          {sale.lead_id ? (
                            <Link
                              href={`/leads/${sale.lead_id}`}
                              prefetch={true}
                              className="hover:text-[#7ddea8]"
                            >
                              {client}
                            </Link>
                          ) : (
                            client
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#7ddea8]">
                          {sale.projects?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {sale.units?.reference ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                          {formatCurrency(Number(sale.sale_price))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#7ddea8]">
                          {formatCurrency(Number(sale.commission_amount))}
                          {commissionHint ? (
                            <span className="ml-1 text-xs text-white/40">
                              ({commissionHint})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {sale.commercial?.full_name ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
