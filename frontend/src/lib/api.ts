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

/** Error carrying the API's user-facing message and HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Fetch a live company snapshot from the Aurum backend. */
export async function getCompany(ticker: string): Promise<Company> {
  const symbol = ticker.trim().toUpperCase();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/company/${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    });
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

  return (await res.json()) as Company;
}
