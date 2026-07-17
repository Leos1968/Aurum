import { NextRequest } from "next/server";

/**
 * Edge-cached proxy in front of the FastAPI backend.
 *
 * The backend lives on Render's free tier, which spins down after idle and
 * takes ~40s to cold-start — unacceptable on a visitor's critical path. All
 * browser traffic goes through this same-origin route instead. Successful
 * responses carry `s-maxage` + `stale-while-revalidate`, so Vercel's CDN
 * serves visitors instantly from the edge and, once a freshness window
 * lapses, keeps serving the last-good value while it refreshes in the
 * background — even while the backend is asleep. A cold upstream is never on
 * a visitor's path: the foreground fetch is time-boxed, and a miss returns a
 * fast, uncached "warming up" (which the client retries) while that same
 * request has already nudged the dyno awake. Same-origin also makes CORS moot.
 */

// Allow a background CDN revalidation to ride out a full Render cold start.
export const maxDuration = 60;

const BACKEND =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://aurum-api-bqrb.onrender.com");

// Longest a visitor-facing request waits on the upstream before we give up
// and return a fast "warming up". Well under maxDuration, so a background
// revalidation can still finish a cold start off the visitor's path.
const UPSTREAM_TIMEOUT_MS = 9_000;

// How long the CDN may keep serving a stale value while it refreshes in the
// background. Deliberately long: a sleeping backend should never blank the
// page — a day-old quote beats a spinner for a recruiter skimming the site.
const STALE_WHILE_REVALIDATE = 86_400;

// Per-path edge freshness windows (seconds). After a window lapses, the next
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

  // File exports are generated per-request and stream binary bodies; never
  // cache those, and let them use the full budget to generate.
  const isExport = joined.includes("/export/");
  const maxAge = isExport
    ? undefined
    : CACHE_RULES.find(([pattern]) => pattern.test(joined))?.[1];

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      // The CDN layer (Cache-Control below) owns caching; the function itself
      // always pulls fresh so a background revalidation sees live data.
      cache: "no-store",
      signal: isExport ? undefined : AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Timed out or unreachable: the backend is almost certainly cold-starting
    // (and this request just triggered the wake). Fail fast with a retryable
    // status instead of hanging, and never cache it so a retry can succeed.
    return Response.json(
      { detail: "The data service is waking up. Try again in a moment." },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "5" } },
    );
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Cache only clean successes at the edge. Errors pass through uncached so a
  // transient upstream hiccup can't get pinned in the CDN.
  if (upstream.ok && maxAge !== undefined) {
    headers.set(
      "cache-control",
      `public, s-maxage=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    );
  } else {
    headers.set("cache-control", "no-store");
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
