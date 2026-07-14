"""yfinance wrapper for live market data.

Every public function in this module is no-raise: network failures,
unknown tickers, and yfinance API quirks all surface as ``None`` (or an
empty list) so the router layer can translate them into clean HTTP
errors instead of stack traces.

Responses that hit Yahoo's slower endpoints are memoized in a small
in-process TTL cache so repeated tab switches don't re-fetch, which
matters on a single free-tier dyno.
"""

import logging
import math
import re
import time
from datetime import datetime, timezone
from typing import Any, Callable

import httpx
import yfinance as yf

logger = logging.getLogger(__name__)

# Tickers are short and alphanumeric, with a few separator characters
# for share classes, international listings, futures, and FX pairs
# (BRK.B, RDS-A, 7203.T, GC=F, EURUSD=X); indices lead with ^ (^GSPC).
_TICKER_RE = re.compile(r"^\^?[A-Z0-9][A-Z0-9.\-^=]{0,11}$")

# Yahoo reports its own internal exchange codes; map the common ones to
# names people actually recognize. Unmapped codes pass through as-is.
_EXCHANGE_NAMES = {
    "NMS": "NASDAQ",
    "NGM": "NASDAQ",
    "NCM": "NASDAQ",
    "NYQ": "NYSE",
    "ASE": "NYSE American",
    "PCX": "NYSE Arca",
    "BTS": "Cboe BZX",
    "PNK": "OTC",
    "LSE": "London Stock Exchange",
    "TOR": "Toronto Stock Exchange",
    "FRA": "Frankfurt",
    "GER": "XETRA",
    "PAR": "Euronext Paris",
    "AMS": "Euronext Amsterdam",
    "JPX": "Tokyo Stock Exchange",
    "HKG": "Hong Kong Stock Exchange",
}

# Chart ranges: UI key -> (yfinance period, bar interval).
_RANGES = {
    "1D": ("1d", "5m"),
    "5D": ("5d", "30m"),
    "1M": ("1mo", "1d"),
    "6M": ("6mo", "1d"),
    "YTD": ("ytd", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
    "MAX": ("max", "1mo"),
}

# key -> (expires_at_epoch, value)
_cache: dict[str, tuple[float, Any]] = {}


def _cached(key: str, ttl_seconds: float, compute: Callable[[], Any]) -> Any:
    """Return the cached value for ``key`` or compute and store it.

    ``None`` results are cached briefly too, so a bad ticker can't be
    used to hammer Yahoo through us.
    """
    now = time.time()
    hit = _cache.get(key)
    if hit and hit[0] > now:
        return hit[1]
    value = compute()
    _cache[key] = (now + (60 if value is None else ttl_seconds), value)
    if len(_cache) > 512:  # crude bound; drop expired entries
        for k in [k for k, (exp, _) in _cache.items() if exp <= now]:
            _cache.pop(k, None)
    return value


def _safe(getter, default: Any = None) -> Any:
    """Evaluate ``getter`` and swallow any exception, returning ``default``."""
    try:
        value = getter()
    except Exception:
        return default
    if isinstance(value, float) and math.isnan(value):
        return default
    return value


def _clean_symbol(raw_ticker: str) -> str | None:
    symbol = raw_ticker.strip().upper()
    return symbol if _TICKER_RE.match(symbol) else None


def _get_info(symbol: str) -> dict:
    """``Ticker.info`` with a 10-minute cache; {} when unavailable."""
    return _cached(
        f"info:{symbol}",
        600,
        lambda: _safe(lambda: yf.Ticker(symbol).info, default={}) or {},
    )


def _display_name(ticker: yf.Ticker, symbol: str) -> str:
    """Best-effort company name lookup, falling back to the raw symbol."""
    info = _get_info(symbol)
    return info.get("longName") or info.get("shortName") or symbol


def get_company_snapshot(raw_ticker: str) -> dict[str, Any] | None:
    """Fetch a live quote snapshot for ``raw_ticker``.

    Returns a dict shaped like ``models.schemas.CompanyResponse``, or
    ``None`` when the ticker is malformed, unknown, or Yahoo returns no
    usable price data.
    """
    symbol = _clean_symbol(raw_ticker)
    if symbol is None:
        return None

    ticker = yf.Ticker(symbol)

    # fast_info is the cheap path for price data; any failure here means
    # the symbol is unknown or Yahoo is unreachable.
    fast_info = _safe(lambda: ticker.fast_info)
    if fast_info is None:
        return None

    price = _safe(lambda: fast_info.last_price)
    previous_close = _safe(lambda: fast_info.previous_close)
    if price is None:
        logger.info("No price data for ticker %s", symbol)
        return None

    if previous_close:
        change = price - previous_close
        change_percent = change / previous_close * 100
    else:
        change = 0.0
        change_percent = 0.0

    exchange_code = _safe(lambda: fast_info.exchange)
    exchange = _EXCHANGE_NAMES.get(exchange_code, exchange_code)

    return {
        "ticker": symbol,
        "name": _display_name(ticker, symbol),
        "price": round(float(price), 4),
        "change": round(float(change), 4),
        "change_percent": round(float(change_percent), 4),
        "currency": _safe(lambda: fast_info.currency) or "USD",
        "market_cap": _safe(lambda: fast_info.market_cap),
        "exchange": exchange,
    }


def get_price_history(raw_ticker: str, range_key: str) -> dict[str, Any] | None:
    """Closing-price series for one chart range, oldest point first."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None or range_key not in _RANGES:
        return None
    period, interval = _RANGES[range_key]

    def compute() -> dict[str, Any] | None:
        frame = _safe(
            lambda: yf.Ticker(symbol).history(period=period, interval=interval, auto_adjust=True)
        )
        if frame is None or frame.empty or "Close" not in frame:
            return None
        closes = frame["Close"].dropna()
        if closes.empty:
            return None
        points = [
            {"t": ts.isoformat(), "c": round(float(price), 4)}
            for ts, price in closes.items()
        ]
        first, last = points[0]["c"], points[-1]["c"]
        change = last - first
        return {
            "ticker": symbol,
            "range_key": range_key,
            "currency": _safe(lambda: yf.Ticker(symbol).fast_info.currency) or "USD",
            "points": points,
            "change": round(change, 4),
            "change_percent": round(change / first * 100, 4) if first else 0.0,
        }

    # Intraday ranges refresh faster than long ranges.
    ttl = 120 if range_key in ("1D", "5D") else 900
    return _cached(f"history:{symbol}:{range_key}", ttl, compute)


def _percentish(value: Any) -> float | None:
    """Convert a 0-1 fraction to percent; pass None through."""
    return round(float(value) * 100, 2) if isinstance(value, (int, float)) else None


def get_key_stats(raw_ticker: str) -> dict[str, Any] | None:
    """Fundamentals for the Overview tab, from ``Ticker.info``."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None:
        return None
    info = _get_info(symbol)
    if not info:
        return None
    price = info.get("currentPrice") or info.get("regularMarketPrice")

    # Yahoo has flip-flopped on whether dividendYield is a fraction or a
    # percent; deriving it from the absolute dividend rate is unambiguous.
    dividend_yield = None
    if info.get("dividendRate") and price:
        dividend_yield = round(info["dividendRate"] / price * 100, 2)

    return {
        "ticker": symbol,
        "currency": info.get("currency") or "USD",
        "trailing_pe": _safe(lambda: round(float(info["trailingPE"]), 2)),
        "forward_pe": _safe(lambda: round(float(info["forwardPE"]), 2)),
        "eps": info.get("trailingEps"),
        "dividend_yield": dividend_yield,
        "beta": _safe(lambda: round(float(info["beta"]), 2)),
        "week52_high": info.get("fiftyTwoWeekHigh"),
        "week52_low": info.get("fiftyTwoWeekLow"),
        "volume": info.get("volume") or info.get("regularMarketVolume"),
        "avg_volume": info.get("averageVolume"),
        "revenue": info.get("totalRevenue"),
        "profit_margin": _percentish(info.get("profitMargins")),
        "return_on_equity": _percentish(info.get("returnOnEquity")),
        "free_cash_flow": info.get("freeCashflow"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "employees": info.get("fullTimeEmployees"),
        "website": info.get("website"),
        "summary": info.get("longBusinessSummary"),
        "target_mean_price": info.get("targetMeanPrice"),
        "recommendation": (info.get("recommendationKey") or "").replace("_", " ") or None,
        "analyst_count": info.get("numberOfAnalystOpinions"),
    }


# Curated line items per statement: (statement key, [(yfinance row, label)]).
_STATEMENT_ROWS = {
    "income": [
        ("Total Revenue", "Total Revenue"),
        ("Gross Profit", "Gross Profit"),
        ("Operating Income", "Operating Income"),
        ("EBITDA", "EBITDA"),
        ("Net Income", "Net Income"),
    ],
    "balance": [
        ("Total Assets", "Total Assets"),
        ("Total Liabilities Net Minority Interest", "Total Liabilities"),
        ("Stockholders Equity", "Stockholders' Equity"),
        ("Cash And Cash Equivalents", "Cash & Equivalents"),
        ("Total Debt", "Total Debt"),
    ],
    "cash": [
        ("Operating Cash Flow", "Operating Cash Flow"),
        ("Investing Cash Flow", "Investing Cash Flow"),
        ("Financing Cash Flow", "Financing Cash Flow"),
        ("Capital Expenditure", "Capital Expenditure"),
        ("Free Cash Flow", "Free Cash Flow"),
    ],
}


def get_financials(raw_ticker: str, statement: str) -> dict[str, Any] | None:
    """A curated annual statement (up to four fiscal years, newest first)."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None or statement not in _STATEMENT_ROWS:
        return None

    def compute() -> dict[str, Any] | None:
        ticker = yf.Ticker(symbol)
        frame = _safe(
            lambda: {
                "income": ticker.income_stmt,
                "balance": ticker.balance_sheet,
                "cash": ticker.cashflow,
            }[statement]
        )
        if frame is None or frame.empty:
            return None
        columns = list(frame.columns)[:4]
        rows = []
        for source_row, label in _STATEMENT_ROWS[statement]:
            if source_row not in frame.index:
                continue
            values = []
            for column in columns:
                value = _safe(lambda: float(frame.loc[source_row, column]))
                values.append(round(value, 2) if value is not None else None)
            if any(v is not None for v in values):
                rows.append({"label": label, "values": values})
        if not rows:
            return None
        return {
            "ticker": symbol,
            "statement": statement,
            "currency": _get_info(symbol).get("financialCurrency")
            or _get_info(symbol).get("currency")
            or "USD",
            "periods": [str(getattr(c, "year", c)) for c in columns],
            "rows": rows,
        }

    return _cached(f"financials:{symbol}:{statement}", 3600, compute)


def get_news(raw_ticker: str) -> list[dict[str, Any]] | None:
    """Latest headlines; handles both old and new yfinance news shapes."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None:
        return None

    def compute() -> list[dict[str, Any]] | None:
        raw = _safe(lambda: yf.Ticker(symbol).news, default=[]) or []
        items = []
        for entry in raw[:10]:
            content = entry.get("content") or entry
            title = content.get("title")
            if not title:
                continue
            link = (
                (content.get("canonicalUrl") or {}).get("url")
                or (content.get("clickThroughUrl") or {}).get("url")
                or entry.get("link")
            )
            publisher = (content.get("provider") or {}).get("displayName") or entry.get("publisher")
            published = content.get("pubDate")
            if not published and entry.get("providerPublishTime"):
                published = datetime.fromtimestamp(
                    entry["providerPublishTime"], tz=timezone.utc
                ).isoformat()
            items.append(
                {"title": title, "publisher": publisher, "link": link, "published": published}
            )
        return items

    return _cached(f"news:{symbol}", 600, compute)


def get_dcf_inputs(raw_ticker: str) -> dict[str, Any] | None:
    """Fundamental inputs for the client-side interactive DCF model."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None:
        return None

    def compute() -> dict[str, Any] | None:
        ticker = yf.Ticker(symbol)
        fast_info = _safe(lambda: ticker.fast_info)
        price = _safe(lambda: fast_info.last_price) if fast_info else None
        if price is None:
            return None
        info = _get_info(symbol)

        fcf_history: list[dict[str, Any]] = []
        cash_flow = _safe(lambda: ticker.cashflow)
        if cash_flow is not None and not cash_flow.empty and "Free Cash Flow" in cash_flow.index:
            for column in list(cash_flow.columns)[:4]:
                value = _safe(lambda: float(cash_flow.loc["Free Cash Flow", column]))
                if value is not None:
                    fcf_history.append({"year": int(getattr(column, "year", 0)), "value": value})
        fcf_history.sort(key=lambda row: row["year"])

        base_fcf = info.get("freeCashflow")
        if base_fcf is None and fcf_history:
            base_fcf = fcf_history[-1]["value"]

        # Suggest a growth rate from the historical FCF CAGR, clamped to
        # a sane band; fall back to a moderate default.
        suggested_growth = 8.0
        if len(fcf_history) >= 2 and fcf_history[0]["value"] > 0 and fcf_history[-1]["value"] > 0:
            years = fcf_history[-1]["year"] - fcf_history[0]["year"]
            if years > 0:
                cagr = ((fcf_history[-1]["value"] / fcf_history[0]["value"]) ** (1 / years) - 1) * 100
                suggested_growth = round(min(max(cagr, 2.0), 20.0), 1)

        net_debt = float(info.get("totalDebt") or 0) - float(info.get("totalCash") or 0)
        shares = info.get("sharesOutstanding") or _safe(lambda: fast_info.shares)

        return {
            "ticker": symbol,
            "currency": (_safe(lambda: fast_info.currency) or "USD"),
            "price": round(float(price), 4),
            "shares_outstanding": shares,
            "net_debt": net_debt,
            "base_fcf": base_fcf,
            "fcf_history": fcf_history,
            "suggested_growth": suggested_growth,
            "suggested_terminal": 2.5,
            "suggested_discount": 10.0,
        }

    return _cached(f"dcf:{symbol}", 1800, compute)


# Instruments on the market tape: (symbol, display label).
_TAPE_SYMBOLS = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq"),
    ("^DJI", "Dow Jones"),
    ("^RUT", "Russell 2000"),
    ("^VIX", "VIX"),
    ("^TNX", "10Y Yield"),
    ("GC=F", "Gold"),
    ("CL=F", "Crude Oil"),
    ("BTC-USD", "Bitcoin"),
    ("EURUSD=X", "EUR/USD"),
]

# S&P sector ETFs used as the sector performance proxy.
_SECTOR_SYMBOLS = [
    ("XLK", "Technology"),
    ("XLF", "Financials"),
    ("XLV", "Health Care"),
    ("XLY", "Cons. Discretionary"),
    ("XLP", "Cons. Staples"),
    ("XLE", "Energy"),
    ("XLI", "Industrials"),
    ("XLU", "Utilities"),
    ("XLB", "Materials"),
    ("XLRE", "Real Estate"),
    ("XLC", "Communications"),
]

_SCREENER_KEYS = {
    "gainers": "day_gainers",
    "losers": "day_losers",
    "actives": "most_actives",
}


def _batch_quotes(symbols: list[str]) -> dict[str, dict[str, float]]:
    """Last price and day change for many symbols in one download call."""

    def compute() -> dict[str, dict[str, float]]:
        frame = _safe(
            lambda: yf.download(
                " ".join(symbols),
                period="5d",
                interval="1d",
                group_by="ticker",
                progress=False,
                threads=True,
            )
        )
        quotes: dict[str, dict[str, float]] = {}
        if frame is None or frame.empty:
            return quotes
        for symbol in symbols:
            closes = _safe(lambda: frame[symbol]["Close"].dropna())
            if closes is None or len(closes) == 0:
                continue
            price = float(closes.iloc[-1])
            previous = float(closes.iloc[-2]) if len(closes) > 1 else price
            change_percent = (price / previous - 1) * 100 if previous else 0.0
            quotes[symbol] = {
                "price": round(price, 4),
                "change_percent": round(change_percent, 4),
            }
        return quotes

    return _cached(f"batch:{','.join(symbols)}", 150, compute) or {}


def _labelled_quotes(pairs: list[tuple[str, str]]) -> list[dict[str, Any]]:
    quotes = _batch_quotes([symbol for symbol, _ in pairs])
    return [
        {"symbol": symbol, "label": label, **quotes[symbol]}
        for symbol, label in pairs
        if symbol in quotes
    ]


def get_market_tape() -> list[dict[str, Any]]:
    """Index/commodity/crypto strip shown across the top of the app."""
    return _labelled_quotes(_TAPE_SYMBOLS)


def get_sector_performance() -> list[dict[str, Any]]:
    """Day change per S&P sector ETF for the dashboard heatmap."""
    return _labelled_quotes(_SECTOR_SYMBOLS)


def get_watch_quotes(raw_symbols: list[str]) -> list[dict[str, Any]]:
    """Live quotes for a user's watchlist (capped, validated symbols)."""
    symbols = []
    for raw in raw_symbols[:20]:
        symbol = _clean_symbol(raw)
        if symbol and symbol not in symbols:
            symbols.append(symbol)
    if not symbols:
        return []
    quotes = _batch_quotes(symbols)
    return [
        {"symbol": symbol, "label": symbol, **quotes[symbol]}
        for symbol in symbols
        if symbol in quotes
    ]


def get_movers(kind: str) -> list[dict[str, Any]] | None:
    """Top gainers/losers/most-active rows from Yahoo's screener."""
    screener_key = _SCREENER_KEYS.get(kind)
    if screener_key is None:
        return None

    def compute() -> list[dict[str, Any]] | None:
        try:
            response = yf.screen(screener_key, count=10)
        except Exception:
            logger.info("Screener %s unavailable", screener_key)
            return None
        quotes = response.get("quotes", []) if isinstance(response, dict) else []
        movers = []
        for quote in quotes:
            symbol = quote.get("symbol")
            price = quote.get("regularMarketPrice")
            change_percent = quote.get("regularMarketChangePercent")
            if not symbol or price is None or change_percent is None:
                continue
            movers.append(
                {
                    "symbol": symbol,
                    "name": quote.get("shortName") or quote.get("longName") or symbol,
                    "price": round(float(price), 4),
                    "change_percent": round(float(change_percent), 4),
                }
            )
        # Yahoo's screener ordering is unreliable outside market hours;
        # enforce the order the panel promises.
        if kind == "gainers":
            movers.sort(key=lambda m: m["change_percent"], reverse=True)
        elif kind == "losers":
            movers.sort(key=lambda m: m["change_percent"])
        return movers[:8] or None

    return _cached(f"movers:{kind}", 300, compute)


def get_market_news() -> list[dict[str, Any]] | None:
    """General market headlines, using the SPY feed as a market proxy."""
    return get_news("SPY")


def get_lbo_inputs(raw_ticker: str) -> dict[str, Any] | None:
    """Fundamental inputs for the client-side interactive LBO model."""
    symbol = _clean_symbol(raw_ticker)
    if symbol is None:
        return None
    info = _get_info(symbol)
    if not info:
        return None

    # Seed the entry multiple from where the market currently trades,
    # clamped to a private-markets-plausible band.
    suggested = info.get("enterpriseToEbitda")
    if isinstance(suggested, (int, float)) and suggested > 0:
        suggested = round(min(max(float(suggested), 5.0), 15.0), 1)
    else:
        suggested = 10.0

    return {
        "ticker": symbol,
        "name": info.get("longName") or info.get("shortName") or symbol,
        "currency": info.get("currency") or "USD",
        "ebitda": info.get("ebitda"),
        "suggested_entry_multiple": suggested,
    }


def get_comps(raw_symbols: list[str]) -> list[dict[str, Any]]:
    """Trading multiples for a set of tickers (comps table rows)."""
    rows = []
    seen: set[str] = set()
    for raw in raw_symbols[:8]:
        symbol = _clean_symbol(raw)
        if symbol is None or symbol in seen:
            continue
        seen.add(symbol)
        info = _get_info(symbol)
        if not info:
            continue
        name = info.get("longName") or info.get("shortName")
        if not name:
            continue
        rows.append(
            {
                "symbol": symbol,
                "name": name,
                "price": info.get("currentPrice") or info.get("regularMarketPrice"),
                "pe": _safe(lambda: round(float(info["trailingPE"]), 1)),
                "ev_ebitda": _safe(lambda: round(float(info["enterpriseToEbitda"]), 1)),
                "ev_revenue": _safe(lambda: round(float(info["enterpriseToRevenue"]), 1)),
                "market_cap": info.get("marketCap"),
            }
        )
    return rows


def search_tickers(query: str) -> list[dict[str, Any]]:
    """Autocomplete search against Yahoo's public symbol lookup."""
    q = query.strip()
    if len(q) < 1:
        return []

    def compute() -> list[dict[str, Any]]:
        try:
            response = httpx.get(
                "https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": q, "quotesCount": 16, "newsCount": 0, "listsCount": 0},
                headers={"User-Agent": "Mozilla/5.0 (aurum-terminal)"},
                timeout=6,
            )
            response.raise_for_status()
            quotes = response.json().get("quotes", [])
        except Exception:
            logger.info("Symbol search failed for %r", q)
            return []
        results = []
        for quote in quotes:
            symbol = quote.get("symbol")
            name = quote.get("shortname") or quote.get("longname")
            if not symbol or not name:
                continue
            if quote.get("quoteType") not in ("EQUITY", "ETF", "INDEX"):
                continue
            results.append(
                {
                    "symbol": symbol,
                    "name": name,
                    "exchange": quote.get("exchDisp"),
                    "type": quote.get("quoteType"),
                }
            )
        return results[:8]

    return _cached(f"search:{q.lower()}", 3600, compute)
