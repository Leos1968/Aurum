"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import NavBar from "@/components/NavBar";
import CompanyCard from "@/components/CompanyCard";
import CompanyCardSkeleton from "@/components/CompanyCardSkeleton";
import Dashboard from "@/components/Dashboard";
import ErrorState from "@/components/ErrorState";
import MarketTape from "@/components/MarketTape";
import SideDrawer from "@/components/SideDrawer";
import ContentSkeleton from "@/components/ContentSkeleton";
import { ApiError, getCompany, type Company } from "@/lib/api";

const WATCHLIST_KEY = "aurum.watchlist";

// The research view pulls in the chart library and all six valuation
// tabs; load it on demand so none of that ships in the homepage bundle.
const ResearchPanel = dynamic(() => import("@/components/ResearchPanel"), {
  loading: () => (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-5">
      <ContentSkeleton rows={6} />
    </div>
  ),
});

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; company: Company }
  | { status: "error"; message: string };

export default function Home() {
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const [watchlist, setWatchlist] = useState<string[]>([]);

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

  // Hydrate the watchlist after mount (avoids SSR mismatches) and honor
  // ?ticker= deep links from research notes and shared URLs.
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
      const deepLink = new URLSearchParams(window.location.search).get("ticker");
      if (!cancelled && deepLink) search(deepLink.trim().toUpperCase());
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

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
      <NavBar
        onSearch={search}
        onHome={() => setView({ status: "idle" })}
        activeTicker={view.status === "success" ? view.company.ticker : null}
      />
      <MarketTape onSelect={search} />

      <SideDrawer
        mode={
          view.status === "success"
            ? { kind: "ticker", company: view.company }
            : { kind: "home" }
        }
      />

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

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-24 pt-10 sm:px-6">
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

      <footer className="space-y-1.5 border-t border-border/60 py-5 text-center text-xs text-text-tertiary">
        <p>
          Designed &amp; built by{" "}
          <a
            href="https://www.linkedin.com/in/jeriel-de-leon-b69551370"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gold transition hover:text-gold-bright"
          >
            Jeriel De Leon
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/Leos1968/Aurum"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-2 transition hover:text-text-secondary"
          >
            GitHub
          </a>{" "}
          ·{" "}
          <a
            href="/Jeriel-De-Leon-Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-2 transition hover:text-text-secondary"
          >
            Resume
          </a>
        </p>
        <p>Aurum · Live data via Yahoo Finance · Models are educational, not investment advice</p>
      </footer>
    </div>
  );
}
