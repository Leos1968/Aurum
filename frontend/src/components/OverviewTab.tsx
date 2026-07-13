"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getStats, type KeyStats } from "@/lib/api";
import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

interface OverviewTabProps {
  ticker: string;
  price: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">{label}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

/** Key statistics, analyst consensus, and company profile. */
export default function OverviewTab({ ticker, price }: OverviewTabProps) {
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStats(ticker)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("Statistics are unavailable for this ticker.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (loading) return <ContentSkeleton rows={7} />;
  if (error || !stats) {
    return <p className="py-6 text-sm text-text-tertiary">{error}</p>;
  }

  const impliedUpside =
    stats.targetMeanPrice != null && price > 0
      ? (stats.targetMeanPrice / price - 1) * 100
      : null;

  return (
    <div className="space-y-6 pt-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Trailing P/E" value={formatNumber(stats.trailingPE)} />
        <Stat label="Forward P/E" value={formatNumber(stats.forwardPE)} />
        <Stat label="EPS (TTM)" value={formatNumber(stats.eps)} />
        <Stat label="Dividend Yield" value={formatPercent(stats.dividendYield)} />
        <Stat label="Beta" value={formatNumber(stats.beta)} />
        <Stat
          label="52-Week Range"
          value={
            stats.week52Low != null && stats.week52High != null
              ? `${stats.week52Low.toFixed(2)} – ${stats.week52High.toFixed(2)}`
              : "—"
          }
        />
        <Stat label="Volume" value={formatCompact(stats.volume)} />
        <Stat label="Avg Volume" value={formatCompact(stats.avgVolume)} />
        <Stat label="Revenue (TTM)" value={formatCompact(stats.revenue, stats.currency)} />
        <Stat label="Profit Margin" value={formatPercent(stats.profitMargin)} />
        <Stat label="Return on Equity" value={formatPercent(stats.returnOnEquity)} />
        <Stat label="Free Cash Flow" value={formatCompact(stats.freeCashFlow, stats.currency)} />
      </div>

      {stats.targetMeanPrice != null && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-gold/20 bg-gold/5 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
              Analyst Mean Target
            </p>
            <p className="mt-1 font-mono text-lg tabular-nums text-text-primary">
              {formatPrice(stats.targetMeanPrice, stats.currency)}
            </p>
          </div>
          {impliedUpside != null && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                Implied vs. Price
              </p>
              <p
                className={`mt-1 font-mono text-lg tabular-nums ${
                  impliedUpside >= 0 ? "text-gain" : "text-loss"
                }`}
              >
                {impliedUpside >= 0 ? "+" : ""}
                {impliedUpside.toFixed(1)}%
              </p>
            </div>
          )}
          {stats.recommendation && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                Consensus
              </p>
              <p className="mt-1 text-lg font-medium capitalize text-gold">
                {stats.recommendation}
                {stats.analystCount != null && (
                  <span className="ml-2 text-xs font-normal text-text-tertiary">
                    {stats.analystCount} analysts
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {(stats.sector || stats.summary) && (
        <div className="rounded-xl border border-border bg-surface px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            {stats.sector && (
              <span className="text-text-secondary">
                <span className="text-text-tertiary">Sector</span> {stats.sector}
              </span>
            )}
            {stats.industry && (
              <span className="text-text-secondary">
                <span className="text-text-tertiary">Industry</span> {stats.industry}
              </span>
            )}
            {stats.employees != null && (
              <span className="font-mono tabular-nums text-text-secondary">
                <span className="font-sans text-text-tertiary">Employees</span>{" "}
                {stats.employees.toLocaleString("en-US")}
              </span>
            )}
            {stats.website && (
              <a
                href={stats.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold transition hover:text-gold-bright"
              >
                Website <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </div>
          {stats.summary && (
            <>
              <p
                className={`mt-3 text-sm leading-relaxed text-text-secondary ${
                  expanded ? "" : "line-clamp-3"
                }`}
              >
                {stats.summary}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-xs font-medium text-gold transition hover:text-gold-bright"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
