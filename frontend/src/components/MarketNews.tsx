"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getMarketNews, type NewsItem } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

/** General market headlines for the dashboard. */
export default function MarketNews() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMarketNews()
      .then((news) => {
        if (!cancelled) setItems(news.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setError("Headlines are unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-text-secondary">
        Market Headlines
      </h3>
      {error ? (
        <p className="py-4 text-sm text-text-tertiary">{error}</p>
      ) : items === null ? (
        <ContentSkeleton rows={5} />
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-text-tertiary">No recent headlines.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={i}>
              <a
                href={item.link ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-text-primary transition group-hover:text-gold">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {[item.publisher, timeAgo(item.published)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ExternalLink
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-text-tertiary transition group-hover:text-gold"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
