"use client";

import { useEffect, useState } from "react";
import { getSectors, type StripQuote } from "@/lib/api";
import ContentSkeleton from "@/components/ContentSkeleton";

interface SectorGridProps {
  onSelect: (symbol: string) => void;
}

/** Day performance heatmap across the 11 S&P sector ETFs. */
export default function SectorGrid({ onSelect }: SectorGridProps) {
  const [sectors, setSectors] = useState<StripQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSectors()
      .then((items) => {
        if (!cancelled) setSectors(items);
      })
      .catch(() => {
        if (!cancelled) setError("Sector data is unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
        Sector Performance
      </h3>
      {error ? (
        <p className="py-4 text-sm text-text-tertiary">{error}</p>
      ) : sectors === null ? (
        <ContentSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {sectors.map((sector) => {
            const gaining = sector.changePercent >= 0;
            return (
              <button
                key={sector.symbol}
                type="button"
                onClick={() => onSelect(sector.symbol)}
                className={`flex items-baseline justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition hover:brightness-125 ${
                  gaining
                    ? "border-gain/25 bg-gain/10"
                    : "border-loss/25 bg-loss/10"
                }`}
                title={`Open ${sector.label} (${sector.symbol})`}
              >
                <span className="min-w-0 truncate text-xs text-text-secondary">
                  {sector.label}
                </span>
                <span
                  className={`shrink-0 font-mono text-sm tabular-nums ${
                    gaining ? "text-gain" : "text-loss"
                  }`}
                >
                  {gaining ? "+" : ""}
                  {sector.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
