"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Company } from "@/lib/api";

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    // Unknown currency code from upstream; show it verbatim.
    return `${price.toFixed(2)} ${currency}`;
  }
}

function formatMarketCap(cap: number | null): string {
  if (cap == null || cap <= 0) return "N/A";
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toLocaleString("en-US");
}

export default function CompanyCard({ company }: { company: Company }) {
  const gaining = company.change >= 0;
  const Arrow = gaining ? ArrowUpRight : ArrowDownRight;
  const sign = gaining ? "+" : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
    >
      <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-xs font-medium tracking-wider text-gold">
              {company.ticker}
            </span>
            {company.exchange && (
              <span className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
                {company.exchange}
              </span>
            )}
          </div>
          <h2 className="mt-3 truncate text-2xl font-semibold tracking-tight">
            {company.name}
          </h2>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-mono text-4xl font-medium tabular-nums tracking-tight">
            {formatPrice(company.price, company.currency)}
          </p>
          <p
            className={`mt-2 flex items-center gap-1 font-mono text-sm tabular-nums sm:justify-end ${
              gaining ? "text-gain" : "text-loss"
            }`}
          >
            <Arrow className="h-4 w-4" aria-hidden />
            {sign}
            {company.change.toFixed(2)} ({sign}
            {company.changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-border bg-surface/60 px-8 py-4">
        <Stat label="Market Cap" value={formatMarketCap(company.marketCap)} />
        <Stat label="Currency" value={company.currency} />
        <Stat label="Exchange" value={company.exchange ?? "N/A"} />
      </div>
    </motion.article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
        {value}
      </p>
    </div>
  );
}
