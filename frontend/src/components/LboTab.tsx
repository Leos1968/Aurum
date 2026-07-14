"use client";

import { useEffect, useMemo, useState } from "react";
import { getLboInputs, type LboInputs } from "@/lib/api";
import { formatCompact } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

const HOLD_YEARS = 5;
// Share of pre-interest cash flow swept to pay down debt each year.
const CASH_SWEEP = 0.5;

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, suffix, onChange }: SliderProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.12em] text-text-tertiary">{label}</label>
        <span className="rounded-md border border-gold/25 bg-gold/10 px-2 py-0.5 font-mono text-xs tabular-nums text-gold">
          {value.toFixed(1)}
          {suffix}
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

/** Interactive 5-year leveraged buyout model on live EBITDA. */
export default function LboTab({ ticker }: { ticker: string }) {
  const [inputs, setInputs] = useState<LboInputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entryMultiple, setEntryMultiple] = useState(10);
  const [debtPct, setDebtPct] = useState(60);
  const [interestRate, setInterestRate] = useState(8);
  const [growth, setGrowth] = useState(6);
  const [exitMultiple, setExitMultiple] = useState(10);

  useEffect(() => {
    let cancelled = false;
    getLboInputs(ticker)
      .then((data) => {
        if (cancelled) return;
        setInputs(data);
        setEntryMultiple(data.suggestedEntryMultiple);
        setExitMultiple(data.suggestedEntryMultiple);
      })
      .catch(() => {
        if (!cancelled) setError("LBO inputs are unavailable for this ticker.");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const model = useMemo(() => {
    if (!inputs?.ebitda || inputs.ebitda <= 0) return null;
    const entryEv = inputs.ebitda * entryMultiple;
    const entryDebt = entryEv * (debtPct / 100);
    const entryEquity = entryEv - entryDebt;
    if (entryEquity <= 0) return null;

    let debt = entryDebt;
    let ebitda = inputs.ebitda;
    for (let year = 1; year <= HOLD_YEARS; year += 1) {
      ebitda = inputs.ebitda * (1 + growth / 100) ** year;
      const interest = debt * (interestRate / 100);
      const sweep = Math.max(0, (ebitda - interest) * CASH_SWEEP);
      debt = Math.max(0, debt - sweep);
    }

    const exitEv = ebitda * exitMultiple;
    const exitEquity = exitEv - debt;
    if (exitEquity <= 0) {
      return { entryEv, entryDebt, entryEquity, exitEv, exitDebt: debt, exitEquity, moic: 0, irr: -100 };
    }
    const moic = exitEquity / entryEquity;
    const irr = (moic ** (1 / HOLD_YEARS) - 1) * 100;
    return { entryEv, entryDebt, entryEquity, exitEv, exitDebt: debt, exitEquity, moic, irr };
  }, [inputs, entryMultiple, debtPct, interestRate, growth, exitMultiple]);

  if (error) return <p className="py-6 text-sm text-text-tertiary">{error}</p>;
  if (!inputs) return <ContentSkeleton rows={7} />;

  if (!inputs.ebitda || inputs.ebitda <= 0) {
    return (
      <p className="py-6 text-sm leading-relaxed text-text-secondary">
        An LBO model isn&apos;t meaningful here: this company has negative or unreported
        EBITDA. Try a mature, cash-generating business.
      </p>
    );
  }

  const irrStrong = model && model.irr >= 20;
  const irrOk = model && model.irr >= 12 && model.irr < 20;

  return (
    <div className="space-y-6 pt-5">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
          <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
            Deal Assumptions
          </h4>
          <Slider label="Entry Multiple (EV/EBITDA)" value={entryMultiple} min={4} max={20} step={0.5} suffix="×" onChange={setEntryMultiple} />
          <Slider label="Debt Financing" value={debtPct} min={0} max={90} step={5} suffix="%" onChange={setDebtPct} />
          <Slider label="Interest Rate" value={interestRate} min={4} max={14} step={0.5} suffix="%" onChange={setInterestRate} />
          <Slider label="EBITDA Growth" value={growth} min={0} max={20} step={0.5} suffix="%" onChange={setGrowth} />
          <Slider label="Exit Multiple (EV/EBITDA)" value={exitMultiple} min={4} max={20} step={0.5} suffix="×" onChange={setExitMultiple} />
          <p className="text-xs leading-relaxed text-text-tertiary">
            EBITDA (TTM) {formatCompact(inputs.ebitda, inputs.currency)} · {HOLD_YEARS}-year hold ·{" "}
            {CASH_SWEEP * 100}% of pre-interest cash flow sweeps to debt paydown.
          </p>
        </div>

        <div className="flex min-w-0 flex-col justify-between rounded-xl border border-gold/25 bg-gold/5 px-5 py-5">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
              Projected Returns
            </h4>
            {model ? (
              <>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">IRR</p>
                    <p
                      className={`font-mono text-4xl tabular-nums tracking-tight ${
                        irrStrong ? "text-gain" : irrOk ? "text-gold" : "text-loss"
                      }`}
                    >
                      {model.irr.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">MoIC</p>
                    <p className="font-mono text-4xl tabular-nums tracking-tight text-text-primary">
                      {model.moic.toFixed(2)}×
                    </p>
                  </div>
                </div>
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm ${
                    irrStrong
                      ? "border-gain/40 bg-gain/10 text-gain"
                      : irrOk
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-loss/40 bg-loss/10 text-loss"
                  }`}
                >
                  {irrStrong
                    ? "Clears the typical 20%+ PE hurdle"
                    : irrOk
                      ? "Below the typical 20% PE hurdle"
                      : "Unattractive at these assumptions"}
                </span>
                <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                  {[
                    ["Entry enterprise value", model.entryEv],
                    ["Entry debt / equity", null],
                    ["Exit enterprise value", model.exitEv],
                    ["Remaining debt at exit", model.exitDebt],
                    ["Exit equity value", model.exitEquity],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-text-tertiary">{label as string}</dt>
                      <dd className="font-mono tabular-nums text-text-secondary">
                        {label === "Entry debt / equity"
                          ? `${formatCompact(model.entryDebt, inputs.currency)} / ${formatCompact(model.entryEquity, inputs.currency)}`
                          : formatCompact(value as number, inputs.currency)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                Equity check is zero or negative at these assumptions — lower the debt share.
              </p>
            )}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-text-tertiary">
            Simplified paper-LBO for educational exploration. Not investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
