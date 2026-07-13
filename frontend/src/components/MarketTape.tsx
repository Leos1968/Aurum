"use client";

import { useEffect, useState } from "react";
import { getMarketTape, type StripQuote } from "@/lib/api";

interface MarketTapeProps {
  onSelect: (symbol: string) => void;
}

function TapeChip({ quote, onSelect }: { quote: StripQuote; onSelect: (s: string) => void }) {
  const gaining = quote.changePercent >= 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(quote.symbol)}
      className="flex shrink-0 items-baseline gap-2 px-4 py-1.5 transition hover:bg-surface"
      title={`Open ${quote.label}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
        {quote.label}
      </span>
      <span className="font-mono text-xs tabular-nums text-text-secondary">
        {quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
      <span
        className={`font-mono text-xs tabular-nums ${gaining ? "text-gain" : "text-loss"}`}
      >
        {gaining ? "+" : ""}
        {quote.changePercent.toFixed(2)}%
      </span>
    </button>
  );
}

/** Scrolling index/commodity/crypto tape shown beneath the nav bar. */
export default function MarketTape({ onSelect }: MarketTapeProps) {
  const [quotes, setQuotes] = useState<StripQuote[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getMarketTape()
        .then((items) => {
          if (!cancelled) setQuotes(items);
        })
        .catch(() => {
          // Tape is decorative; stay hidden on failure.
        });
    load();
    const interval = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="group overflow-hidden border-b border-border bg-surface/50">
      <div className="flex w-max animate-[aurum-tape_55s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1}>
            {quotes.map((quote) => (
              <TapeChip key={`${copy}-${quote.symbol}`} quote={quote} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
