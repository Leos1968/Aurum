"""Aurum API entry point.

Run locally with:
    uvicorn main:app --reload
"""

import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import company, market, search
from services import market_data

# Load backend/.env regardless of the process working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)


def _warm_caches() -> None:
    """Prime the dashboard data caches so the first request is instant.

    On Render's free tier the dyno cold-starts after idle; running the
    slow upstream fetches here, off the request path, means the first
    visitor's dashboard hits warm caches instead of waiting on them.
    """
    for label, fn in (
        ("tape", market_data.get_market_tape),
        ("sectors", market_data.get_sector_performance),
        ("gainers", lambda: market_data.get_movers("gainers")),
        ("market news", market_data.get_market_news),
    ):
        try:
            fn()
        except Exception:
            logger.info("Cache warm failed for %s", label)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm in a daemon thread so startup (and the health check that wakes
    # the dyno) returns immediately while caches fill in the background.
    threading.Thread(target=_warm_caches, daemon=True).start()
    yield


app = FastAPI(
    title="Aurum API",
    description="Market data backend for the Aurum equity valuation terminal.",
    version="0.1.0",
    lifespan=lifespan,
)

# Local dev origin is always allowed; deployed frontend origins come from
# the FRONTEND_ORIGIN env var (comma-separated to support domain aliases).
_allowed_origins = ["http://localhost:3000"]
for _origin in os.getenv("FRONTEND_ORIGIN", "").split(","):
    _origin = _origin.strip().rstrip("/")
    if _origin and _origin not in _allowed_origins:
        _allowed_origins.append(_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Any deployment of this app's Vercel project (production domains and
    # preview builds) is allowed without needing an env var change.
    allow_origin_regex=r"https://aurum-[a-z0-9-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(company.router)
app.include_router(market.router)
app.include_router(search.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Liveness probe used by deployment platforms and the frontend."""
    return {"status": "ok"}


@app.get("/api/debug/yahoo")
def debug_yahoo() -> dict:
    """Temporary: report what the Yahoo crumb handshake sees from this host."""
    import httpx as _httpx

    from services import market_data as _md

    report: dict = {}
    _md._reset_yahoo_session()
    client, crumb = _md._yahoo_session()
    report["crumb"] = (crumb[:12] + "…") if crumb else None
    report["crumb_ok"] = bool(crumb)
    # raw getcrumb probe
    try:
        c = _httpx.Client(headers=_md._YF_HEADERS, timeout=10, follow_redirects=True)
        c.get("https://fc.yahoo.com")
        r = c.get("https://query1.finance.yahoo.com/v1/test/getcrumb")
        report["getcrumb_status"] = r.status_code
        report["getcrumb_body"] = r.text[:60]
    except Exception as exc:
        report["getcrumb_error"] = f"{type(exc).__name__}: {exc}"[:120]
    # quoteSummary probe
    if crumb and client is not None:
        try:
            r = client.get(
                "https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL",
                params={"modules": "price", "crumb": crumb},
            )
            report["quoteSummary_status"] = r.status_code
            report["quoteSummary_body"] = r.text[:80]
        except Exception as exc:
            report["quoteSummary_error"] = f"{type(exc).__name__}: {exc}"[:120]
    return report
