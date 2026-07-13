"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

/** Custom select menu styled for the dark terminal theme. */
export default function Dropdown({ options, value, onChange, ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);

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
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary transition hover:border-gold/40"
      >
        {current?.label ?? value}
        <ChevronDown
          className={`h-4 w-4 text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 min-w-full overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-surface ${
                option.value === value ? "text-gold" : "text-text-secondary"
              }`}
            >
              {option.label}
              {option.value === value && <Check className="h-3.5 w-3.5" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
