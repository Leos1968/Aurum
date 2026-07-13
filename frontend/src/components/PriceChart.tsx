"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHistory, type History } from "@/lib/api";
import { formatPrice } from "@/lib/format";

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;

interface PriceChartProps {
  ticker: string;
  currency: string;
}

function formatTick(iso: string, range: string): string {
  const date = new Date(iso);
  if (range === "1D") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (range === "5D" || range === "1M") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (range === "6M" || range === "YTD" || range === "1Y") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  return date.toLocaleDateString("en-US", { year: "numeric" });
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: { t: string; c: number } }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-xl">
      <p className="font-mono text-sm tabular-nums text-text-primary">
        {formatPrice(point.c, currency)}
      </p>
      <p className="mt-0.5 text-xs text-text-tertiary">
        {new Date(point.t).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

/** Interactive closing-price chart with range selection. */
export default function PriceChart({ ticker, currency }: PriceChartProps) {
  const [range, setRange] = useState<string>("1Y");
  const [result, setResult] = useState<{
    key: string;
    history: History | null;
    error: string | null;
  }>({ key: "", history: null, error: null });

  const requestKey = `${ticker}:${range}`;
  const loading = result.key !== requestKey;
  const history = loading ? null : result.history;
  const error = loading ? null : result.error;

  useEffect(() => {
    let cancelled = false;
    getHistory(ticker, range)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, history: data, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, history: null, error: "Chart data unavailable for this range." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, range, requestKey]);

  const gaining = (history?.change ?? 0) >= 0;
  const domain = useMemo(() => {
    if (!history?.points.length) return ["auto", "auto"] as const;
    const values = history.points.map((p) => p.c);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.06 || max * 0.01;
    return [min - pad, max + pad] as const;
  }, [history]);

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Price
          </h3>
          {history && !loading && (
            <span
              className={`font-mono text-sm tabular-nums ${gaining ? "text-gain" : "text-loss"}`}
            >
              {gaining ? "+" : ""}
              {history.changePercent.toFixed(2)}% {range}
            </span>
          )}
        </div>
        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs transition ${
                r === range
                  ? "bg-gold/15 text-gold"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full animate-pulse rounded-xl bg-border/30" />
        ) : error || !history?.points.length ? (
          <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
            {error ?? "No chart data available."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history.points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="aurum-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tickFormatter={(iso: string) => formatTick(iso, range)}
                tick={{ fill: "#6B6B76", fontSize: 11 }}
                axisLine={{ stroke: "#2A2A31" }}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                dataKey="c"
                domain={domain as [number, number]}
                orientation="right"
                width={64}
                tickFormatter={(v: number) => v.toFixed(v >= 1000 ? 0 : 2)}
                tick={{ fill: "#6B6B76", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Area
                type="monotone"
                dataKey="c"
                stroke="#D4AF37"
                strokeWidth={1.8}
                fill="url(#aurum-area)"
                dot={false}
                activeDot={{ r: 3, fill: "#F2CE5B", stroke: "#0A0A0B" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
