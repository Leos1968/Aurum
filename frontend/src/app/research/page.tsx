import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PITCHES } from "@/data/pitches";

export const metadata: Metadata = {
  title: "Research · Aurum",
  description:
    "Investment frameworks and research notes by Jeriel De Leon, each linked to Aurum's live valuation models.",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResearchPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="select-none" aria-label="Back to the terminal">
            <span className="bg-gradient-to-b from-gold-bright to-gold bg-clip-text font-serif text-[1.7rem] leading-none tracking-tight text-transparent">
              Aurum
            </span>
          </Link>
          <Link
            href="/"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition hover:border-gold/40 hover:text-text-primary"
          >
            Open the terminal
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_65%)]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-24 pt-14 sm:px-6">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-gold-muted">
            Research Notes
          </p>
          <h1 className="mt-4 text-center font-serif text-3xl tracking-tight text-text-primary">
            Analysis, written down
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-text-secondary">
            Frameworks and research notes by Jeriel De Leon — each one runs on the live
            models in this terminal, so you can pressure-test every claim yourself.
          </p>

          <div className="mt-12 space-y-8">
            {PITCHES.map((pitch) => (
              <article
                key={pitch.slug}
                className="rounded-2xl border border-border bg-surface-raised p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-xs font-medium tracking-wider text-gold">
                    {pitch.ticker}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
                    {pitch.tag}
                  </span>
                  <span className="text-xs text-text-tertiary">{formatDate(pitch.date)}</span>
                </div>
                <h2 className="mt-4 font-serif text-2xl tracking-tight text-text-primary">
                  {pitch.title}
                </h2>
                <p className="mt-2 text-sm italic leading-relaxed text-text-secondary">
                  {pitch.summary}
                </p>
                <div className="mt-5 space-y-4 border-t border-border pt-5">
                  {pitch.body.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-text-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/?ticker=${encodeURIComponent(pitch.ticker)}`}
                  className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
                >
                  Run {pitch.ticker} in the terminal
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-5 text-center text-xs text-text-tertiary">
        Research notes are educational frameworks, not investment advice.
      </footer>
    </div>
  );
}
