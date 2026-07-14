"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getWatchQuotes, type StripQuote } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

interface WatchlistPanelProps {
  watchlist: string[];
  onSelect: (symbol: string) => void;
}

/** Live quotes for the user's starred tickers on the dashboard. */
export default function WatchlistPanel({ watchlist, onSelect }: WatchlistPanelProps) {
  const [quotes, setQuotes] = useState<StripQuote[] | null>(null);

  useEffect(() => {
    if (watchlist.length === 0) return;
    let cancelled = false;
    getWatchQuotes(watchlist)
      .then((items) => {
        if (!cancelled) setQuotes(items);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  if (watchlist.length === 0) return null;

  return (
    <section className="min-w-0 rounded-2xl border border-gold/20 bg-surface-raised p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
        <Star className="h-3.5 w-3.5 text-gold" fill="currentColor" aria-hidden />
        Your Watchlist
      </h3>
      {quotes === null ? (
        <ContentSkeleton rows={Math.min(watchlist.length, 4)} />
      ) : quotes.length === 0 ? (
        <p className="py-3 text-sm text-text-tertiary">Quotes are unavailable right now.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {quotes.map((quote) => {
            const gaining = quote.changePercent >= 0;
            return (
              <li key={quote.symbol}>
                <button
                  type="button"
                  onClick={() => onSelect(quote.symbol)}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface"
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-medium text-gold">
                    {quote.symbol}
                  </span>
                  <span className="flex-1 text-right font-mono text-sm tabular-nums text-text-primary">
                    {formatPrice(quote.price)}
                  </span>
                  <span
                    className={`w-20 shrink-0 text-right font-mono text-sm tabular-nums ${
                      gaining ? "text-gain" : "text-loss"
                    }`}
                  >
                    {gaining ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%
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
