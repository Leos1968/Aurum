"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, Search } from "lucide-react";

interface NavBarProps {
  onSearch: (ticker: string) => void;
}

export default function NavBar({ onSearch }: NavBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (ticker) onSearch(ticker);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-6">
        <Link href="/" className="shrink-0 select-none" aria-label="Aurum home">
          <span className="bg-gradient-to-b from-gold-bright to-gold bg-clip-text font-serif text-[1.7rem] leading-none tracking-tight text-transparent">
            Aurum
          </span>
        </Link>

        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 justify-center">
          <div className="relative w-full max-w-md">
            <button
              type="submit"
              aria-label="Search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary outline-none transition hover:text-gold focus-visible:text-gold"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Search ticker, e.g. AAPL"
              aria-label="Search ticker"
              spellCheck={false}
              autoComplete="off"
              className="h-10 w-full rounded-full border border-border bg-surface pl-11 pr-4 font-mono text-sm uppercase tracking-wider text-text-primary outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-text-tertiary focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled
            title="PDF export arrives in a later phase"
            className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-tertiary"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            PDF
          </button>
          <button
            type="button"
            disabled
            title="Excel export arrives in a later phase"
            className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-tertiary"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
            Excel
          </button>
        </div>
      </div>
    </header>
  );
}
