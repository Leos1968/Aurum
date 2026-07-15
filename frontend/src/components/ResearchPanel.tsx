"use client";

import { useState } from "react";
import PriceChart from "@/components/PriceChart";
import Tabs from "@/components/Tabs";
import OverviewTab from "@/components/OverviewTab";
import FinancialsTab from "@/components/FinancialsTab";
import ValuationTab from "@/components/ValuationTab";
import LboTab from "@/components/LboTab";
import CompsTab from "@/components/CompsTab";
import NewsTab from "@/components/NewsTab";
import type { Company } from "@/lib/api";

const RESEARCH_TABS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "valuation", label: "DCF" },
  { id: "lbo", label: "LBO" },
  { id: "comps", label: "Comps" },
  { id: "news", label: "News" },
];

/**
 * The full research view (chart + valuation tabs). Kept in its own module
 * so it — and its heavy chart dependency — code-splits out of the initial
 * homepage bundle and only loads once a company is opened.
 */
export default function ResearchPanel({ company }: { company: Company }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="mt-6 space-y-6">
      <PriceChart ticker={company.ticker} currency={company.currency} />
      <section className="rounded-2xl border border-border bg-surface-raised px-5 pb-5 pt-2">
        <Tabs tabs={RESEARCH_TABS} active={tab} onChange={setTab} />
        {tab === "overview" && <OverviewTab ticker={company.ticker} price={company.price} />}
        {tab === "financials" && <FinancialsTab ticker={company.ticker} />}
        {tab === "valuation" && <ValuationTab ticker={company.ticker} />}
        {tab === "lbo" && <LboTab ticker={company.ticker} />}
        {tab === "comps" && <CompsTab ticker={company.ticker} />}
        {tab === "news" && <NewsTab ticker={company.ticker} />}
      </section>
    </div>
  );
}
