"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronRight, Gauge, Lightbulb, Sparkles } from "lucide-react";
import { getStats, type Company, type KeyStats } from "@/lib/api";
import { formatPercent } from "@/lib/format";

type DrawerMode =
  | { kind: "home" }
  | { kind: "ticker"; company: Company };

interface SideDrawerProps {
  mode: DrawerMode;
}

const GLOSSARY: { term: string; def: string }[] = [
  { term: "P/E ratio", def: "Price ÷ earnings per share. How many dollars you pay for one dollar of annual profit." },
  { term: "EV/EBITDA", def: "Enterprise value ÷ operating earnings. A capital-structure-neutral way to compare valuations." },
  { term: "DCF", def: "Discounted cash flow. Values a company as the present value of its future free cash flow." },
  { term: "IRR", def: "Internal rate of return. The annualized return an investment earns over its holding period." },
  { term: "MoIC", def: "Multiple on invested capital. Total value returned ÷ equity invested — a 2× doubles your money." },
  { term: "Beta", def: "How much a stock moves relative to the market. Above 1 is more volatile than the index." },
  { term: "Free cash flow", def: "Cash left after operating costs and capital spending — the fuel for dividends, buybacks, and growth." },
];

function HomeContent() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          What you can do here
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text-secondary">
          <li>Search any public company for a live quote and chart.</li>
          <li>Read four years of income, balance sheet, and cash flow statements.</li>
          <li>Run interactive DCF, LBO, and comps valuation models.</li>
          <li>Export a formula-driven Excel model or a one-page PDF tearsheet.</li>
        </ul>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <BookOpen className="h-4 w-4 text-gold" aria-hidden />
          Metric glossary
        </h3>
        <dl className="mt-2 space-y-3">
          {GLOSSARY.map((item) => (
            <div key={item.term}>
              <dt className="text-sm font-medium text-text-primary">{item.term}</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-text-tertiary">{item.def}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg border border-gold/20 bg-gold/5 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-gold">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          Tip
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Star a company from its header to pin it to your watchlist, and use the
          Comps tab to benchmark a stock against peers you choose.
        </p>
      </div>
    </div>
  );
}

function Insight({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss" | "neutral";
  detail: string;
}) {
  const color =
    tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-text-primary";
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-tertiary">{detail}</p>
    </div>
  );
}

function TickerContent({ company }: { company: Company }) {
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStats(company.ticker)
      .then((data) => !cancelled && setStats(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [company.ticker]);

  const rangePos =
    stats?.week52Low != null && stats?.week52High != null && stats.week52High > stats.week52Low
      ? ((company.price - stats.week52Low) / (stats.week52High - stats.week52Low)) * 100
      : null;
  const vsTarget =
    stats?.targetMeanPrice != null && company.price > 0
      ? (stats.targetMeanPrice / company.price - 1) * 100
      : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-sm font-medium text-gold">{company.ticker}</p>
        <h3 className="text-sm font-semibold leading-snug text-text-primary">{company.name}</h3>
      </div>

      {failed ? (
        <p className="text-xs text-text-tertiary">Deeper metrics are unavailable right now.</p>
      ) : !stats ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-border/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Gauge className="h-3.5 w-3.5 text-gold" aria-hidden />
            <span className="font-medium text-text-primary">At a glance</span>
          </div>

          {rangePos != null && (
            <Insight
              label="52-week position"
              value={`${rangePos.toFixed(0)}%`}
              tone={rangePos >= 50 ? "gain" : "loss"}
              detail={
                rangePos >= 80
                  ? "Trading near its 52-week high — momentum is strong but so is the risk of being late."
                  : rangePos <= 20
                    ? "Trading near its 52-week low — either a value setup or a falling knife; the tabs tell you which."
                    : "Sitting in the middle of its yearly range."
              }
            />
          )}

          {vsTarget != null && (
            <Insight
              label="Vs. analyst target"
              value={`${vsTarget >= 0 ? "+" : ""}${vsTarget.toFixed(1)}%`}
              tone={vsTarget >= 0 ? "gain" : "loss"}
              detail={
                vsTarget >= 0
                  ? "Analysts' average target sits above today's price — implied upside, on their numbers."
                  : "Price is above the average analyst target — the street sees it as fully valued."
              }
            />
          )}

          {stats.trailingPE != null && (
            <Insight
              label="Valuation (P/E)"
              value={`${stats.trailingPE.toFixed(1)}×`}
              tone="neutral"
              detail={
                stats.trailingPE > 30
                  ? "A rich multiple — the market is pricing in strong future growth. Pressure-test it in the DCF tab."
                  : stats.trailingPE < 15
                    ? "A modest multiple — cheap on earnings, though check whether growth is stalling."
                    : "A middle-of-the-road earnings multiple."
              }
            />
          )}

          {stats.profitMargin != null && (
            <Insight
              label="Profit margin"
              value={formatPercent(stats.profitMargin)}
              tone={stats.profitMargin >= 15 ? "gain" : "neutral"}
              detail={
                stats.profitMargin >= 20
                  ? "Highly profitable — keeps a large share of every dollar of revenue."
                  : stats.profitMargin < 0
                    ? "Currently unprofitable — valuation leans entirely on future growth."
                    : "A workable but not exceptional margin."
              }
            />
          )}

          <p className="pt-1 text-[11px] leading-relaxed text-text-tertiary">
            Plain-English reads, not investment advice. Open the Comps tab to add
            peers and see how {company.ticker} stacks up.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Left-edge slide-out panel. A gold handle sits against the viewport edge;
 * hovering it (or tapping on touch) reveals contextual help — an orientation
 * guide and glossary on the home screen, computed insights for the open
 * company otherwise.
 */
export default function SideDrawer({ mode }: SideDrawerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside tap (touch devices, where there is no mouse-leave).
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const label = mode.kind === "home" ? "Guide" : "Insights";

  return (
    <div
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
    >
      <div className="flex items-stretch">
        {/* Sliding panel */}
        <div
          className={`overflow-hidden transition-[width,opacity] duration-300 ease-out ${
            open ? "w-[320px] opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="max-h-[80vh] w-[320px] overflow-y-auto rounded-r-2xl border border-l-0 border-border bg-surface-raised p-5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
            {mode.kind === "home" ? <HomeContent /> : <TickerContent company={mode.company} />}
          </div>
        </div>

        {/* Always-visible handle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? `Hide ${label}` : `Show ${label}`}
          className="flex items-center self-center rounded-r-lg border border-l-0 border-gold/40 bg-gold/10 py-4 pl-1 pr-1.5 text-gold transition hover:bg-gold/20"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="[writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-[0.2em]">
            {label}
          </span>
        </button>
      </div>
    </div>
  );
}
