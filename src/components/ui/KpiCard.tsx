import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export function KpiCard({ title, value, hint, icon, className }: KpiCardProps) {
  return (
    <div className={cn("crm-panel p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/50">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-white/35">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-xl bg-[#1f8f63]/15 p-2.5 text-[#7ddea8]">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
