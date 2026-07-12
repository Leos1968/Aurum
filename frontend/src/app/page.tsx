"use client";

import { useCallback, useState } from "react";
import NavBar from "@/components/NavBar";
import CompanyCard from "@/components/CompanyCard";
import CompanyCardSkeleton from "@/components/CompanyCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { ApiError, getCompany, type Company } from "@/lib/api";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; company: Company }
  | { status: "error"; message: string };

export default function Home() {
  const [view, setView] = useState<ViewState>({ status: "idle" });

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

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar onSearch={search} />

      <main className="relative flex-1">
        {/* Faint gold wash at the top of the viewport, behind the content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_65%)]"
        />

        <div className="relative mx-auto w-full max-w-3xl px-6 pb-24 pt-20">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-gold-muted">
            Equity Valuation Terminal
          </p>

          <div className="mt-8">
            {view.status === "idle" && <EmptyState onSelect={search} />}
            {view.status === "loading" && <CompanyCardSkeleton />}
            {view.status === "success" && (
              // Keyed by ticker so a new search replays the mount animation.
              <CompanyCard key={view.company.ticker} company={view.company} />
            )}
            {view.status === "error" && <ErrorState message={view.message} />}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-5 text-center text-xs text-text-tertiary">
        Aurum · Phase 0 · Market data via Yahoo Finance
      </footer>
    </div>
  );
}
