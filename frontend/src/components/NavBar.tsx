"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, Search } from "lucide-react";
import { searchTickers, type SearchResult } from "@/lib/api";

interface NavBarProps {
  onSearch: (ticker: string) => void;
}

export default function NavBar({ onSearch }: NavBarProps) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete lookup.
  useEffect(() => {
    const query = value.trim();
    const timer = setTimeout(
      () => {
        if (query.length < 1) {
          setResults([]);
          setOpen(false);
          return;
        }
        searchTickers(query)
          .then((matches) => {
            setResults(matches);
            setOpen(matches.length > 0);
            setHighlight(-1);
          })
          .catch(() => setResults([]));
      },
      query.length < 1 ? 0 : 250,
    );
    return () => clearTimeout(timer);
  }, [value]);

  // Close the dropdown on any outside click.
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(symbol: string) {
    setValue("");
    setResults([]);
    setOpen(false);
    onSearch(symbol);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (highlight >= 0 && results[highlight]) {
      pick(results[highlight].symbol);
      return;
    }
    const raw = value.trim().toUpperCase();
    if (raw) pick(raw);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
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
          <div ref={boxRef} className="relative w-full max-w-md">
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
              onFocus={() => setOpen(results.length > 0)}
              onKeyDown={handleKeyDown}
              placeholder="Search ticker or company"
              aria-label="Search ticker"
              spellCheck={false}
              autoComplete="off"
              className="h-10 w-full rounded-full border border-border bg-surface pl-11 pr-4 font-mono text-sm uppercase tracking-wider text-text-primary outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-text-tertiary focus:border-gold/60 focus:ring-2 focus:ring-gold/25"
            />
            {open && results.length > 0 && (
              <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
                {results.map((result, i) => (
                  <button
                    key={result.symbol}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(result.symbol)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                      i === highlight ? "bg-surface" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="shrink-0 font-mono text-sm font-medium text-gold">
                        {result.symbol}
                      </span>
                      <span className="truncate text-sm text-text-secondary">{result.name}</span>
                    </span>
                    {result.exchange && (
                      <span className="shrink-0 text-[11px] uppercase tracking-wider text-text-tertiary">
                        {result.exchange}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
