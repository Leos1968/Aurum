"""Company data endpoints."""

from fastapi import APIRouter, HTTPException

from models.schemas import CompanyResponse
from services.market_data import get_company_snapshot

router = APIRouter(prefix="/api/company", tags=["company"])


@router.get("/{ticker}", response_model=CompanyResponse)
def get_company(ticker: str) -> CompanyResponse:
    """Return a live quote snapshot for ``ticker``.

    Responds 404 with a friendly message when the ticker is unknown or
    market data is unavailable; never leaks internals to the client.
    """
    snapshot = get_company_snapshot(ticker)
    if snapshot is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No market data found for '{ticker.strip().upper()}'. "
                "Check the ticker symbol and try again."
            ),
        )
    return CompanyResponse(**snapshot)
