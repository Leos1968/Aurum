"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getDcfInputs, type DcfInputs } from "@/lib/api";
import { formatCompact, formatPrice } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

const PROJECTION_YEARS = 5;

interface Assumption {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function AssumptionSlider({ label, value, min, max, step, onChange }: Assumption) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{label}</label>
        <span className="rounded-md border border-gold/25 bg-gold/10 px-2 py-0.5 font-mono text-xs tabular-nums text-gold">
          {value.toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-gold"
        aria-label={label}
      />
    </div>
  );
}

/** Interactive 5-year discounted cash flow model on live fundamentals. */
export default function ValuationTab({ ticker }: { ticker: string }) {
  const [inputs, setInputs] = useState<DcfInputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [growth, setGrowth] = useState(8);
  const [terminal, setTerminal] = useState(2.5);
  const [discount, setDiscount] = useState(10);

  useEffect(() => {
    let cancelled = false;
    getDcfInputs(ticker)
      .then((data) => {
        if (cancelled) return;
        setInputs(data);
        setGrowth(data.suggestedGrowth);
        setTerminal(data.suggestedTerminal);
        setDiscount(data.suggestedDiscount);
      })
      .catch(() => {
        if (!cancelled) setError("Valuation inputs are unavailable for this ticker.");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const model = useMemo(() => {
    if (
      !inputs ||
      inputs.baseFcf == null ||
      inputs.baseFcf <= 0 ||
      !inputs.sharesOutstanding ||
      discount <= terminal
    ) {
      return null;
    }
    const g = growth / 100;
    const tg = terminal / 100;
    const r = discount / 100;
    let presentValue = 0;
    let fcf = inputs.baseFcf;
    for (let year = 1; year <= PROJECTION_YEARS; year += 1) {
      fcf *= 1 + g;
      presentValue += fcf / (1 + r) ** year;
    }
    const terminalValue = (fcf * (1 + tg)) / (r - tg);
    const enterpriseValue = presentValue + terminalValue / (1 + r) ** PROJECTION_YEARS;
    const equityValue = enterpriseValue - inputs.netDebt;
    const perShare = equityValue / inputs.sharesOutstanding;
    const upside = (perShare / inputs.price - 1) * 100;
    return { enterpriseValue, equityValue, perShare, upside };
  }, [inputs, growth, terminal, discount]);

  if (error) return <p className="py-6 text-sm text-text-tertiary">{error}</p>;
  if (!inputs) return <ContentSkeleton rows={7} />;

  const fcfNotUsable = inputs.baseFcf == null || inputs.baseFcf <= 0 || !inputs.sharesOutstanding;

  return (
    <div className="space-y-6 pt-5">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Assumptions
          </h4>
          <AssumptionSlider
            label="FCF Growth (5y)"
            value={growth}
            min={0}
            max={25}
            step={0.5}
            onChange={setGrowth}
          />
          <AssumptionSlider
            label="Terminal Growth"
            value={terminal}
            min={0}
            max={4}
            step={0.1}
            onChange={setTerminal}
          />
          <AssumptionSlider
            label="Discount Rate"
            value={discount}
            min={6}
            max={15}
            step={0.5}
            onChange={setDiscount}
          />
          {discount <= terminal && (
            <p className="text-xs text-loss">
              Discount rate must exceed terminal growth for the model to converge.
            </p>
          )}
          <p className="text-xs leading-relaxed text-text-tertiary">
            Base FCF {formatCompact(inputs.baseFcf, inputs.currency)} · Net debt{" "}
            {formatCompact(inputs.netDebt, inputs.currency)} · Shares{" "}
            {formatCompact(inputs.sharesOutstanding)}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gold/25 bg-gold/5 px-5 py-5">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
              Intrinsic Value
            </h4>
            {fcfNotUsable ? (
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                A DCF isn&apos;t meaningful here: this company has negative or unreported
                free cash flow. Try a mature, cash-generating business.
              </p>
            ) : model ? (
              <>
                <p className="mt-3 font-mono text-4xl tabular-nums tracking-tight text-text-primary">
                  {formatPrice(model.perShare, inputs.currency)}
                </p>
                <p className="mt-1 text-sm text-text-tertiary">
                  vs. market price {formatPrice(inputs.price, inputs.currency)}
                </p>
                <span
                  className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm tabular-nums ${
                    model.upside >= 0
                      ? "border-gain/40 bg-gain/10 text-gain"
                      : "border-loss/40 bg-loss/10 text-loss"
                  }`}
                >
                  {model.upside >= 0 ? "Undervalued" : "Overvalued"} ·{" "}
                  {model.upside >= 0 ? "+" : ""}
                  {model.upside.toFixed(1)}%
                </span>
                <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">Enterprise value</dt>
                    <dd className="font-mono tabular-nums text-text-secondary">
                      {formatCompact(model.enterpriseValue, inputs.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">Equity value</dt>
                    <dd className="font-mono tabular-nums text-text-secondary">
                      {formatCompact(model.equityValue, inputs.currency)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : null}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-text-tertiary">
            Simplified {PROJECTION_YEARS}-year DCF for educational exploration. Not
            investment advice.
          </p>
        </div>
      </div>

      {inputs.fcfHistory.length >= 2 && (
        <div className="rounded-xl border border-border bg-surface px-5 py-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Free Cash Flow History
          </h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inputs.fcfHistory} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#6B6B76", fontSize: 11 }}
                  axisLine={{ stroke: "#2A2A31" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(212,175,55,0.06)" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-xl">
                        <p className="font-mono text-sm tabular-nums text-text-primary">
                          {formatCompact(payload[0].value as number, inputs.currency)}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
