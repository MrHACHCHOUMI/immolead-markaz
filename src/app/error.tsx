"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#071510] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7b56d]">
          ImmoLead × Markaz
        </p>
        <h1 className="mt-2 text-xl font-semibold">Erreur application</h1>
        <p className="mt-2 text-sm text-rose-100">
          {error.message || "Une erreur inattendue s’est produite."}
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="crm-btn" onClick={reset}>
            Réessayer
          </button>
          <a href="/dashboard" className="crm-btn-ghost">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
