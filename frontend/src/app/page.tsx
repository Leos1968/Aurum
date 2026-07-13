"use client";

import { useCallback, useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import CompanyCard from "@/components/CompanyCard";
import CompanyCardSkeleton from "@/components/CompanyCardSkeleton";
import Dashboard from "@/components/Dashboard";
import ErrorState from "@/components/ErrorState";
import MarketTape from "@/components/MarketTape";
import PriceChart from "@/components/PriceChart";
import Tabs from "@/components/Tabs";
import OverviewTab from "@/components/OverviewTab";
import FinancialsTab from "@/components/FinancialsTab";
import ValuationTab from "@/components/ValuationTab";
import NewsTab from "@/components/NewsTab";
import { ApiError, getCompany, type Company } from "@/lib/api";

const WATCHLIST_KEY = "aurum.watchlist";

const RESEARCH_TABS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "valuation", label: "Valuation" },
  { id: "news", label: "News" },
];

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; company: Company }
  | { status: "error"; message: string };

function ResearchPanel({ company }: { company: Company }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="mt-6 space-y-6">
      <PriceChart ticker={company.ticker} currency={company.currency} />
      <section className="rounded-2xl border border-border bg-surface-raised px-5 pb-5 pt-2">
        <Tabs tabs={RESEARCH_TABS} active={tab} onChange={setTab} />
        {tab === "overview" && <OverviewTab ticker={company.ticker} price={company.price} />}
        {tab === "financials" && <FinancialsTab ticker={company.ticker} />}
        {tab === "valuation" && <ValuationTab ticker={company.ticker} />}
        {tab === "news" && <NewsTab ticker={company.ticker} />}
      </section>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Hydrate the watchlist after mount to avoid SSR mismatches.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
        if (!cancelled && Array.isArray(stored)) {
          setWatchlist(stored.filter((t) => typeof t === "string"));
        }
      } catch {
        // Corrupt storage; start fresh.
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const search = useCallback(async (ticker: string) => {
    setView({ status: "loading" });
    try {
      const company = await getCompany(ticker);
      setView({ status: "success", company });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Something went wrong fetching market data.";
      setView({ status: "error", message });
    }
  }, []);

  const toggleWatch = useCallback((ticker: string) => {
    setWatchlist((current) => {
      const next = current.includes(ticker)
        ? current.filter((t) => t !== ticker)
        : [...current, ticker];
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode); watchlist stays in-memory.
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar onSearch={search} />
      <MarketTape onSelect={search} />

      {watchlist.length > 0 && view.status !== "idle" && (
        <div className="border-b border-border/60 bg-surface/40">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-6 py-2">
            <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
              Watchlist
            </span>
            {watchlist.map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => search(ticker)}
                className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs tracking-wider text-text-secondary transition hover:border-gold/50 hover:text-gold"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="relative flex-1">
        {/* Faint gold wash at the top of the viewport, behind the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_65%)]"
        />

        <div className="relative mx-auto w-full max-w-4xl px-6 pb-24 pt-10">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-gold-muted">
            Equity Valuation Terminal
          </p>

          <div className="mt-6">
            {view.status === "idle" && <Dashboard watchlist={watchlist} onSelect={search} />}
            {view.status === "loading" && <CompanyCardSkeleton />}
            {view.status === "error" && <ErrorState message={view.message} />}
            {view.status === "success" && (
              // Keyed by ticker so a new search remounts chart and tabs.
              <div key={view.company.ticker}>
                <CompanyCard
                  company={view.company}
                  watched={watchlist.includes(view.company.ticker)}
                  onToggleWatch={() => toggleWatch(view.company.ticker)}
                />
                <ResearchPanel company={view.company} />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-5 text-center text-xs text-text-tertiary">
        Aurum · Live data via Yahoo Finance · Models are educational, not investment advice
      </footer>
    </div>
  );
}
