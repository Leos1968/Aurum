// All requests go through the same-origin /api/aurum proxy, which serves
// from Vercel's global cache (stale-while-revalidate) so visitors never
// wait on the backend's free-tier cold start. The proxy forwards to the
// FastAPI service (BACKEND_URL / localhost in dev) on the server side.
export const API_URL = "/api/aurum";

/** Direct-download URL for the formula-driven Excel model. */
export const excelExportUrl = (symbol: string) =>
  `${API_URL}/api/company/${encodeURIComponent(symbol.trim().toUpperCase())}/export/xlsx`;

/** Direct-download URL for the one-page PDF tearsheet. */
export const pdfExportUrl = (symbol: string) =>
  `${API_URL}/api/company/${encodeURIComponent(symbol.trim().toUpperCase())}/export/pdf`;

export interface Company {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  marketCap: number | null;
  exchange: string | null;
}

export interface PricePoint {
  t: string;
  c: number;
}

export interface History {
  ticker: string;
  range: string;
  currency: string;
  points: PricePoint[];
  change: number;
  changePercent: number;
}

export interface KeyStats {
  ticker: string;
  currency: string;
  trailingPE: number | null;
  forwardPE: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
  volume: number | null;
  avgVolume: number | null;
  revenue: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  freeCashFlow: number | null;
  sector: string | null;
  industry: string | null;
  employees: number | null;
  website: string | null;
  summary: string | null;
  targetMeanPrice: number | null;
  recommendation: string | null;
  analystCount: number | null;
}

export interface FinancialRow {
  label: string;
  values: (number | null)[];
}

export interface Financials {
  ticker: string;
  statement: "income" | "balance" | "cash";
  currency: string;
  periods: string[];
  rows: FinancialRow[];
}

export interface NewsItem {
  title: string;
  publisher: string | null;
  link: string | null;
  published: string | null;
}

export interface News {
  ticker: string;
  items: NewsItem[];
}

export interface FcfYear {
  year: number;
  value: number;
}

export interface DcfInputs {
  ticker: string;
  currency: string;
  price: number;
  sharesOutstanding: number | null;
  netDebt: number;
  baseFcf: number | null;
  fcfHistory: FcfYear[];
  suggestedGrowth: number;
  suggestedTerminal: number;
  suggestedDiscount: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
}

export interface LboInputs {
  ticker: string;
  name: string;
  currency: string;
  ebitda: number | null;
  suggestedEntryMultiple: number;
}

export interface CompsRow {
  symbol: string;
  name: string;
  price: number | null;
  pe: number | null;
  evEbitda: number | null;
  evRevenue: number | null;
  marketCap: number | null;
}

export interface StripQuote {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
}

export interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

/** Error carrying the API's user-facing message and HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// The proxy answers 503 while the free-tier backend cold-starts, which on
// Render can take 40-60s. Retry against a wall-clock deadline that outlasts a
// full spin-up (rather than a fixed attempt count, which a slow cold start
// silently outlives) so a first-of-the-day visitor watches the page fill in
// on its own instead of landing on a stuck error. Backoff is exponential and
// capped. Only the failure path waits — a healthy request returns immediately.
const WARMING_RETRY_BUDGET_MS = 60_000;
const WARMING_RETRY_MIN_MS = 1_200;
const WARMING_RETRY_MAX_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(path: string): Promise<T> {
  const deadline = Date.now() + WARMING_RETRY_BUDGET_MS;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    } catch {
      throw new ApiError(
        "Cannot reach the Aurum API. Make sure the backend is running.",
        0,
      );
    }

    // 503 is the proxy's "backend is cold-starting" signal. Keep retrying with
    // backoff until the deadline so the page recovers as the dyno wakes.
    if (res.status === 503 && Date.now() < deadline) {
      const delay = Math.min(WARMING_RETRY_MIN_MS * 2 ** attempt, WARMING_RETRY_MAX_MS);
      await sleep(delay);
      continue;
    }

    if (!res.ok) {
      let message = "Something went wrong fetching market data.";
      try {
        const body = (await res.json()) as { detail?: unknown };
        if (typeof body.detail === "string") message = body.detail;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      throw new ApiError(message, res.status);
    }

    return (await res.json()) as T;
  }
}

const ticker = (raw: string) => encodeURIComponent(raw.trim().toUpperCase());

export const getCompany = (symbol: string) =>
  request<Company>(`/api/company/${ticker(symbol)}`);

export const getHistory = (symbol: string, range: string) =>
  request<History>(`/api/company/${ticker(symbol)}/history?range=${encodeURIComponent(range)}`);

export const getStats = (symbol: string) =>
  request<KeyStats>(`/api/company/${ticker(symbol)}/stats`);

export const getFinancials = (symbol: string, statement: string) =>
  request<Financials>(
    `/api/company/${ticker(symbol)}/financials?statement=${encodeURIComponent(statement)}`,
  );

export const getNews = (symbol: string) =>
  request<News>(`/api/company/${ticker(symbol)}/news`);

export const getDcfInputs = (symbol: string) =>
  request<DcfInputs>(`/api/company/${ticker(symbol)}/dcf`);

export const searchTickers = async (query: string): Promise<SearchResult[]> => {
  const data = await request<{ query: string; results: SearchResult[] }>(
    `/api/search?q=${encodeURIComponent(query)}`,
  );
  return data.results;
};

export const getLboInputs = (symbol: string) =>
  request<LboInputs>(`/api/company/${ticker(symbol)}/lbo`);

export const getComps = async (symbols: string[]): Promise<CompsRow[]> =>
  (
    await request<{ rows: CompsRow[] }>(
      `/api/market/comps?symbols=${encodeURIComponent(symbols.join(","))}`,
    )
  ).rows;

export const getMarketTape = async (): Promise<StripQuote[]> =>
  (await request<{ items: StripQuote[] }>("/api/market/tape")).items;

export const getSectors = async (): Promise<StripQuote[]> =>
  (await request<{ items: StripQuote[] }>("/api/market/sectors")).items;

export const getWatchQuotes = async (symbols: string[]): Promise<StripQuote[]> =>
  (
    await request<{ items: StripQuote[] }>(
      `/api/market/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
    )
  ).items;

export const getMovers = async (kind: string): Promise<Mover[]> =>
  (await request<{ kind: string; items: Mover[] }>(`/api/market/movers?kind=${kind}`)).items;

export const getMarketNews = async (): Promise<NewsItem[]> =>
  (await request<{ items: NewsItem[] }>("/api/market/news")).items;
