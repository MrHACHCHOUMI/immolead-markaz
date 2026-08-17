"use client";

type BrandLoaderProps = {
  title?: string;
  subtitle?: string;
};

export function BrandLoader({
  title = "ImmoLead × Markaz",
  subtitle = "Chargement…",
}: BrandLoaderProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071510] text-white">
      <div className="flex flex-col items-center brand-fade-up">
        <div className="relative mb-5 h-14 w-14">
          <div className="absolute inset-0 rounded-xl border border-[#d7b56d]/35" />
          <div className="absolute inset-0 brand-spin rounded-xl border-2 border-transparent border-t-[#7ddea8]" />
          <div className="absolute inset-2 flex items-center justify-center rounded-lg bg-[#0c1f18] text-sm font-semibold text-[#d7b56d]">
            IM
          </div>
        </div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-white/50">{subtitle}</p>
      </div>
    </div>
  );
}
