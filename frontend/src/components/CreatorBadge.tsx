"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileDown } from "lucide-react";

const LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/jeriel-de-leon-b69551370",
    Icon: ExternalLink,
  },
  { label: "GitHub", href: "https://github.com/Leos1968", Icon: ExternalLink },
  { label: "Resume (PDF)", href: "/Jeriel-De-Leon-Resume.pdf", Icon: FileDown },
];

/** "Built by" badge in the nav: creator credit + LinkedIn/GitHub/resume. */
export default function CreatorBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="About the creator, Jeriel De Leon"
        title="Built by Jeriel De Leon"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-2.5 text-xs font-medium text-gold transition hover:bg-gold/20"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold font-serif text-[11px] font-bold text-bg">
          J
        </span>
        <span className="hidden lg:inline">Built by Jeriel De Leon</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
          <p className="px-4 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-text-tertiary">
            Designed & built by
          </p>
          <p className="px-4 pb-2 text-sm font-medium text-text-primary">Jeriel De Leon</p>
          {LINKS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary transition hover:bg-surface hover:text-gold"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
