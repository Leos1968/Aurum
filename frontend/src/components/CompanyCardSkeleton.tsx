/** Loading placeholder mirroring the CompanyCard layout. */
export default function CompanyCardSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-2xl border border-border bg-surface-raised"
      aria-label="Loading company data"
    >
      <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 rounded-md bg-border/60" />
            <div className="h-3 w-20 rounded bg-border/40" />
          </div>
          <div className="mt-4 h-7 w-56 max-w-full rounded bg-border/60" />
        </div>
        <div className="flex shrink-0 flex-col sm:items-end">
          <div className="h-9 w-40 rounded bg-border/60" />
          <div className="mt-3 h-4 w-28 rounded bg-border/40" />
        </div>
      </div>
      <div className="flex items-center gap-10 border-t border-border bg-surface/60 px-8 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="h-3 w-16 rounded bg-border/40" />
            <div className="mt-2 h-4 w-14 rounded bg-border/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
