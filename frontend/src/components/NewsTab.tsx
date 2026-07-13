"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getNews, type NewsItem } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import ContentSkeleton from "@/components/ContentSkeleton";

/** Latest headlines for the active ticker. */
export default function NewsTab({ ticker }: { ticker: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNews(ticker)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError("News is unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (error) return <p className="py-6 text-sm text-text-tertiary">{error}</p>;
  if (items === null) return <ContentSkeleton rows={6} />;
  if (items.length === 0) {
    return <p className="py-6 text-sm text-text-tertiary">No recent headlines.</p>;
  }

  return (
    <ul className="divide-y divide-border pt-2">
      {items.map((item, i) => (
        <li key={i}>
          <a
            href={item.link ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-4 py-4"
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
  );
}
