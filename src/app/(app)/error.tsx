"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6">
        <h1 className="text-lg font-semibold text-white">Cette page a échoué</h1>
        <p className="mt-2 text-sm text-rose-100">
          {error.message || "Impossible d’afficher cette section."}
        </p>
        <button type="button" className="crm-btn mt-4" onClick={reset}>
          Réessayer
        </button>
      </div>
    </div>
  );
}
