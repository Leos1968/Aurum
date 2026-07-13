"use client";

import { useEffect, useState } from "react";
import { getFinancials, type Financials } from "@/lib/api";
import { formatCompact } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";
import Dropdown from "@/components/Dropdown";

const STATEMENTS = [
  { value: "income", label: "Income Statement" },
  { value: "balance", label: "Balance Sheet" },
  { value: "cash", label: "Cash Flow" },
];

/** Annual financial statements with a statement picker. */
export default function FinancialsTab({ ticker }: { ticker: string }) {
  const [statement, setStatement] = useState("income");
  const [cache, setCache] = useState<Record<string, Financials>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const data = cache[statement];
  const error = errors[statement];
  const loading = !data && !error;

  useEffect(() => {
    if (cache[statement] || errors[statement]) return;
    let cancelled = false;
    getFinancials(ticker, statement)
      .then((result) => {
        if (!cancelled) setCache((prev) => ({ ...prev, [statement]: result }));
      })
      .catch(() => {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            [statement]: "This statement isn't available for the ticker.",
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, statement, cache, errors]);

  return (
    <div className="pt-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-tertiary">
          Annual figures{data ? ` in ${data.currency}` : ""}
        </p>
        <Dropdown
          options={STATEMENTS}
          value={statement}
          onChange={setStatement}
          ariaLabel="Choose financial statement"
        />
      </div>

      {loading && !data ? (
        <ContentSkeleton rows={6} />
      ) : error && !data ? (
        <p className="py-6 text-sm text-text-tertiary">{error}</p>
      ) : data ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3 text-left font-medium text-text-tertiary">
                  Line Item
                </th>
                {data.periods.map((period) => (
                  <th
                    key={period}
                    className="px-4 py-3 text-right font-mono font-medium tabular-nums text-text-secondary"
                  >
                    FY {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((row) => (
                <tr key={row.label} className="transition hover:bg-surface/60">
                  <td className="px-4 py-3 text-text-secondary">{row.label}</td>
                  {row.values.map((value, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-right font-mono tabular-nums ${
                        value != null && value < 0 ? "text-loss" : "text-text-primary"
                      }`}
                    >
                      {formatCompact(value, data.currency)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
