/**
 * Research notes shown on /research.
 *
 * To publish a new pitch, add an entry here — newest first. Keep theses
 * factual and framework-driven; every note carries the site-wide
 * "educational, not investment advice" disclaimer.
 */

export interface Pitch {
  slug: string;
  title: string;
  ticker: string;
  date: string; // ISO date
  tag: string; // e.g. "Framework", "Long thesis", "Sector note"
  summary: string;
  body: string[]; // paragraphs
}

export const PITCHES: Pitch[] = [
  {
    slug: "how-i-evaluate-a-stock",
    title: "How I evaluate a stock: my four-step framework",
    ticker: "AAPL",
    date: "2026-07-14",
    tag: "Framework",
    summary:
      "The repeatable process behind every note on this page — business quality, unit economics, valuation range, and pre-mortem risks — illustrated with Apple as the walkthrough example.",
    body: [
      "Step 1 — Business quality. Before any numbers, I ask what the company actually sells, who pays for it, and how hard it would be to displace. For Apple, the answer is an installed base of over two billion devices feeding a high-margin services business: the hardware is the storefront, and services (roughly 27% net margins company-wide) are the recurring engine.",
      "Step 2 — Unit economics and trajectory. I open the Financials tab and read four years of statements side by side: is revenue growing, are margins expanding or compressing, and does free cash flow track net income? Apple converts around $100B of free cash flow annually with remarkable consistency, but FCF has been roughly flat since 2022 — growth is the open question, not quality.",
      "Step 3 — Valuation range, not a point estimate. A single DCF output is false precision, so I bracket it. In the Valuation tab, a conservative 2% FCF growth assumption implies a fair value far below the market price, while the growth rate the market is effectively pricing in sits well above Apple's recent history. The Comps tab frames the same tension: Apple trades at a premium to mega-cap peers on EV/EBITDA. The market is paying for an inflection I would need evidence for.",
      "Step 4 — Pre-mortem. Before forming a view, I write down what would have to be true for the position to fail: services growth decelerating, regulatory pressure on the App Store take rate, or hardware cycles lengthening. If I can't articulate the bear case in three sentences, I don't understand the company yet.",
      "The point of this framework isn't the specific numbers — they'll be stale in a quarter. It's that every input above is checkable, live, inside this terminal: run the same walkthrough on any ticker and the conclusion is yours, not mine.",
    ],
  },
];
