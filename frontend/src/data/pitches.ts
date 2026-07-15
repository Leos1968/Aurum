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
    slug: "nvda-what-the-price-assumes",
    title: "NVIDIA: reverse-engineering what the price assumes",
    ticker: "NVDA",
    date: "2026-07-15",
    tag: "Valuation note",
    summary:
      "Instead of asking what NVIDIA is worth, this note inverts the question: what growth, margins, and multiples does the current price already require? A sensitivity exercise using the terminal's DCF, LBO, and comps tabs.",
    body: [
      "The most useful valuation question for a stock like NVIDIA isn't \"what's my price target\" — it's \"what does today's price already assume?\" A reverse DCF turns the model around: hold the discount rate steady, then raise the free-cash-flow growth slider until implied value meets the market price. The growth rate you land on is the market's embedded expectation, and the debate stops being about opinions and starts being about whether that number is achievable.",
      "Run it in the Valuation tab: at a 10% discount rate, note the growth assumption required for fair value to reach the current quote, and compare it against the company's actual FCF trajectory in the Financials tab. The gap between required growth and delivered growth is the size of the bet the market is making on AI capex continuing.",
      "The Comps tab frames the same question relatively. NVIDIA against the other mega-cap platforms (try MSFT, GOOGL, AVGO, AMD as a peer set) trades at a clear premium on EV/Revenue — a premium that is only justified if its revenue is worth more per dollar than peers', meaning higher margins and a longer growth runway. The peer-median row makes the size of that premium explicit rather than vibes-based.",
      "One more lens the buy-side would use: the LBO tab. Hypothetically levering a business at these multiples produces IRRs far below any private-equity hurdle at almost any reasonable assumption set — which is itself information. It tells you the stock's return story is entirely a growth story, not a cash-flow-and-leverage story, and that the downside case depends on multiple compression, not debt math.",
      "The takeaway isn't a buy or a sell — it's that every input in this note is checkable live in the terminal, and the honest answer changes as the numbers do. That's the discipline: know what you're paying for before deciding whether to pay for it.",
    ],
  },
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
