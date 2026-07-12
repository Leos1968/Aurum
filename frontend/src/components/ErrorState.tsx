"use client";

import { SearchX } from "lucide-react";

interface ErrorStateProps {
  message: string;
}

/** Shown when a lookup fails: unknown ticker, network trouble, etc. */
export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-loss/30 bg-loss/5 px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-loss/30 bg-loss/10">
        <SearchX className="h-5 w-5 text-loss" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold">Nothing came back</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        {message}
      </p>
    </div>
  );
}
