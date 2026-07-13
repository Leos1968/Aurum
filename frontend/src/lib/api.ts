const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

/** Error carrying the API's user-facing message and HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(
      "Cannot reach the Aurum API. Make sure the backend is running.",
      0,
    );
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
