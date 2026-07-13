"use client";

import { TrendingUp } from "lucide-react";
import MoversPanel from "@/components/MoversPanel";
import SectorGrid from "@/components/SectorGrid";
import MarketNews from "@/components/MarketNews";
import WatchlistPanel from "@/components/WatchlistPanel";

const SUGGESTIONS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL"];

interface DashboardProps {
  watchlist: string[];
  onSelect: (symbol: string) => void;
}

/** Pre-search home screen: live market context plus quick entry points. */
export default function Dashboard({ watchlist, onSelect }: DashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10">
          <TrendingUp className="h-5 w-5 text-gold" aria-hidden />
        </div>
        <h1 className="mt-4 font-serif text-3xl tracking-tight text-text-primary">
          Research any stock in seconds
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Live quotes, charts, fundamentals, financial statements, news, and an
          interactive DCF valuation model — in one terminal.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
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

      <WatchlistPanel watchlist={watchlist} onSelect={onSelect} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MoversPanel onSelect={onSelect} />
        <SectorGrid onSelect={onSelect} />
      </div>

      <MarketNews />
    </div>
  );
}
