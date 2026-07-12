"""Aurum API entry point.

Run locally with:
    uvicorn main:app --reload
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import company

# Load backend/.env regardless of the process working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="Aurum API",
    description="Market data backend for the Aurum equity valuation terminal.",
    version="0.1.0",
)

# Local dev origin is always allowed; the deployed frontend origin comes
# from the FRONTEND_ORIGIN env var.
_allowed_origins = ["http://localhost:3000"]
_frontend_origin = os.getenv("FRONTEND_ORIGIN")
if _frontend_origin and _frontend_origin not in _allowed_origins:
    _allowed_origins.append(_frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(company.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Liveness probe used by deployment platforms and the frontend."""
    return {"status": "ok"}
