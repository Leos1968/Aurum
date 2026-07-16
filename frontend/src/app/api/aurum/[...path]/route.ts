import { NextRequest } from "next/server";

/**
 * Edge-cached proxy in front of the FastAPI backend.
 *
 * The backend lives on Render's free tier, which spins down after idle and
 * takes ~50s to cold-start — unacceptable on a visitor's critical path. All
 * browser traffic goes through this same-origin route instead: responses
 * are stored in Vercel's global data cache with stale-while-revalidate
 * semantics, so visitors are served instantly from cache (even when the
 * backend is asleep) while refreshes — and cold starts — happen in the
 * background. Bonus: same-origin requests make CORS moot.
 */

// Allow slow background revalidations to survive a full Render cold start.
export const maxDuration = 60;

const BACKEND =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://aurum-api-bqrb.onrender.com");

// Per-path freshness windows (seconds). After a window lapses, the next
// request is still served from cache while a background refresh runs.
const CACHE_RULES: [RegExp, number][] = [
  [/^api\/market\/tape$/, 120],
  [/^api\/market\/quotes$/, 120],
  [/^api\/market\/(sectors|movers)$/, 300],
  [/^api\/market\/news$/, 600],
  [/^api\/market\/comps$/, 1800],
  [/^api\/search$/, 86400],
  [/^api\/company\/[^/]+\/history$/, 300],
  [/^api\/company\/[^/]+\/(stats|financials|dcf|lbo|news)$/, 1800],
  [/^api\/company\/[^/]+$/, 120],
  [/^api\/health$/, 30],
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const joined = path.join("/");
  const upstreamUrl = `${BACKEND}/${joined}${request.nextUrl.search}`;

  // File exports are generated per-request and stream binary bodies;
  // never cache those.
  const revalidate = joined.includes("/export/")
    ? undefined
    : CACHE_RULES.find(([pattern]) => pattern.test(joined))?.[1];

  let upstream: Response;
  try {
    upstream = await fetch(
      upstreamUrl,
      revalidate === undefined ? { cache: "no-store" } : { next: { revalidate } },
    );
  } catch {
    return Response.json(
      { detail: "The data service is waking up. Try again in a moment." },
      { status: 503 },
    );
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
