"""Aurum API entry point.

Run locally with:
    uvicorn main:app --reload
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import company, search

# Load backend/.env regardless of the process working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="Aurum API",
    description="Market data backend for the Aurum equity valuation terminal.",
    version="0.1.0",
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
app.include_router(search.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Liveness probe used by deployment platforms and the frontend."""
    return {"status": "ok"}
