"use client";

import { useEffect, useState } from "react";
import { getMovers, type Mover } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";
import Dropdown from "@/components/Dropdown";

const KINDS = [
  { value: "gainers", label: "Top Gainers" },
  { value: "losers", label: "Top Losers" },
  { value: "actives", label: "Most Active" },
];

interface MoversPanelProps {
  onSelect: (symbol: string) => void;
}

/** Today's gainers/losers/most-active stocks, switchable via dropdown. */
export default function MoversPanel({ onSelect }: MoversPanelProps) {
  const [kind, setKind] = useState("gainers");
  const [cache, setCache] = useState<Record<string, Mover[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const movers = cache[kind];
  const error = errors[kind];
  const loading = !movers && !error;

  useEffect(() => {
    if (cache[kind] || errors[kind]) return;
    let cancelled = false;
    getMovers(kind)
      .then((items) => {
        if (!cancelled) setCache((prev) => ({ ...prev, [kind]: items }));
      })
      .catch(() => {
        if (!cancelled) {
          setErrors((prev) => ({ ...prev, [kind]: "Screener data is unavailable right now." }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, cache, errors]);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
          Market Movers
        </h3>
        <Dropdown options={KINDS} value={kind} onChange={setKind} ariaLabel="Choose mover list" />
      </div>

      {loading ? (
        <ContentSkeleton rows={6} />
      ) : error ? (
        <p className="py-4 text-sm text-text-tertiary">{error}</p>
      ) : (
        <ul>
          {movers.map((mover) => {
            const gaining = mover.changePercent >= 0;
            return (
              <li key={mover.symbol}>
                <button
                  type="button"
                  onClick={() => onSelect(mover.symbol)}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface"
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-medium text-gold">
                    {mover.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                    {mover.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-text-primary">
                    {formatPrice(mover.price)}
                  </span>
                  <span
                    className={`w-20 shrink-0 text-right font-mono text-sm tabular-nums ${
                      gaining ? "text-gain" : "text-loss"
                    }`}
                  >
                    {gaining ? "+" : ""}
                    {mover.changePercent.toFixed(2)}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
