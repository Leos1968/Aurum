"use client";

import { TrendingUp } from "lucide-react";

const SUGGESTIONS = ["AAPL", "MSFT", "NVDA", "TSLA"];

interface EmptyStateProps {
  onSelect: (ticker: string) => void;
}

/** Shown before the first search: a quiet invitation to try a ticker. */
export default function EmptyState({ onSelect }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 px-8 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10">
        <TrendingUp className="h-5 w-5 text-gold" aria-hidden />
      </div>
      <h2 className="mt-5 font-serif text-2xl text-text-primary">
        Search any ticker
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        Pull a live quote through the Aurum backend. Valuation models,
        filings, and tearsheets arrive in later phases.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((ticker) => (
          <button
            key={ticker}
            type="button"
            onClick={() => onSelect(ticker)}
            className="rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-xs tracking-wider text-text-secondary transition hover:border-gold/50 hover:text-gold"
          >
            {ticker}
          </button>
        ))}
      </div>
    </div>
  );
}
