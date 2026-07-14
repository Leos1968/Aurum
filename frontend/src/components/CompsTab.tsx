"use client";

import { useEffect, useState } from "react";
import { getComps, type CompsRow } from "@/lib/api";
import { formatCompact, formatNumber, formatPrice } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Comparable-companies multiples table with user-chosen peers. */
export default function CompsTab({ ticker }: { ticker: string }) {
  const [peersInput, setPeersInput] = useState("");
  const [peerList, setPeerList] = useState<string[]>([]);
  const [result, setResult] = useState<{
    key: string;
    rows: CompsRow[] | null;
    error: string | null;
  }>({ key: "", rows: null, error: null });

  const requestKey = `${ticker}:${peerList.join(",")}`;
  const loading = result.key !== requestKey;
  const rows = loading ? null : result.rows;
  const error = loading ? null : result.error;

  useEffect(() => {
    let cancelled = false;
    getComps([ticker, ...peerList])
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, rows: data, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, rows: null, error: "Comparable data is unavailable right now." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, peerList, requestKey]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPeerList(
      peersInput
        .split(",")
        .map((p) => p.trim().toUpperCase())
        .filter((p) => p && p !== ticker),
    );
  }

  const peers = (rows ?? []).filter((r) => r.symbol !== ticker);
  const medians = {
    pe: median(peers.map((r) => r.pe).filter((v): v is number => v != null)),
    evEbitda: median(peers.map((r) => r.evEbitda).filter((v): v is number => v != null)),
    evRevenue: median(peers.map((r) => r.evRevenue).filter((v): v is number => v != null)),
  };

  return (
    <div className="space-y-4 pt-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input
          value={peersInput}
          onChange={(event) => setPeersInput(event.target.value)}
          placeholder="Add peers, e.g. MSFT, GOOGL, AMZN"
          aria-label="Peer tickers"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 font-mono text-sm uppercase tracking-wider text-text-primary outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-text-tertiary focus:border-gold/60"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg border border-gold/40 bg-gold/10 px-4 text-sm font-medium text-gold transition hover:bg-gold/20"
        >
          Compare
        </button>
      </form>

      {loading && !rows ? (
        <ContentSkeleton rows={4} />
      ) : error ? (
        <p className="py-4 text-sm text-text-tertiary">{error}</p>
      ) : rows && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3 text-left font-medium text-text-tertiary">Company</th>
                <th className="px-4 py-3 text-right font-medium text-text-tertiary">Price</th>
                <th className="px-4 py-3 text-right font-medium text-text-tertiary">P/E</th>
                <th className="px-4 py-3 text-right font-medium text-text-tertiary">EV/EBITDA</th>
                <th className="px-4 py-3 text-right font-medium text-text-tertiary">EV/Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-text-tertiary">Mkt Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isTarget = row.symbol === ticker;
                return (
                  <tr key={row.symbol} className={isTarget ? "bg-gold/5" : "transition hover:bg-surface/60"}>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-medium ${isTarget ? "text-gold" : "text-text-primary"}`}>
                        {row.symbol}
                      </span>
                      <span className="ml-2 hidden text-text-tertiary sm:inline">{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {row.price != null ? formatPrice(row.price) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary">
                      {formatNumber(row.pe)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary">
                      {formatNumber(row.evEbitda)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary">
                      {formatNumber(row.evRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                      {formatCompact(row.marketCap, "USD")}
                    </td>
                  </tr>
                );
              })}
              {peers.length >= 2 && (
                <tr className="border-t border-gold/25 bg-surface">
                  <td className="px-4 py-3 font-medium text-text-secondary">Peer Median</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-gold">
                    {formatNumber(medians.pe)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-gold">
                    {formatNumber(medians.evEbitda)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-gold">
                    {formatNumber(medians.evRevenue)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-text-tertiary">
        Trailing multiples from live market data. Add 3–5 industry peers to frame where{" "}
        {ticker} trades against its comp set.
      </p>
    </div>
  );
}
