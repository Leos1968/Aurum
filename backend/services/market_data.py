"""yfinance wrapper for live market data.

Every public function in this module is no-raise: network failures,
unknown tickers, and yfinance API quirks all surface as ``None`` so the
router layer can translate them into clean HTTP errors instead of stack
traces.
"""

import logging
import math
import re
from typing import Any

import yfinance as yf

logger = logging.getLogger(__name__)

# Tickers are short and alphanumeric, with a few separator characters
# for share classes and international listings (BRK.B, RDS-A, 7203.T).
_TICKER_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-^=]{0,11}$")

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


def _safe(getter, default: Any = None) -> Any:
    """Evaluate ``getter`` and swallow any exception, returning ``default``."""
    try:
        value = getter()
    except Exception:
        return default
    if isinstance(value, float) and math.isnan(value):
        return default
    return value


def _display_name(ticker: yf.Ticker, symbol: str) -> str:
    """Best-effort company name lookup, falling back to the raw symbol.

    ``Ticker.info`` is the only place Yahoo exposes the long name; it is
    slower than ``fast_info`` and occasionally fails outright, so treat
    it as a nice-to-have.
    """
    info = _safe(lambda: ticker.info, default={}) or {}
    return info.get("longName") or info.get("shortName") or symbol


def get_company_snapshot(raw_ticker: str) -> dict[str, Any] | None:
    """Fetch a live quote snapshot for ``raw_ticker``.

    Returns a dict shaped like ``models.schemas.CompanyResponse``, or
    ``None`` when the ticker is malformed, unknown, or Yahoo returns no
    usable price data.
    """
    symbol = raw_ticker.strip().upper()
    if not _TICKER_RE.match(symbol):
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
