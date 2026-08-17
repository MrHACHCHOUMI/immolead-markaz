export function PageSkeleton() {
  return (
    <div className="min-h-[60vh] animate-pulse p-6">
      <div className="mb-6 h-8 w-48 rounded-lg bg-white/5" />
      <div className="crm-panel space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}
