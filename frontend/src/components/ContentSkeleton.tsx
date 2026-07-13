/** Generic pulsing placeholder used while tab content loads. */
export default function ContentSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 py-2" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-border/50"
          style={{ width: `${88 - (i % 3) * 14}%` }}
        />
      ))}
    </div>
  );
}
