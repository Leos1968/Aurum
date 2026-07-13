"""Ticker symbol search for the autocomplete dropdown."""

from fastapi import APIRouter, Query

from models.schemas import SearchResponse
from services.market_data import search_tickers

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResponse)
def search(q: str = Query(min_length=1, max_length=40)) -> SearchResponse:
    """Match tickers and company names; empty result list is not an error."""
    return SearchResponse(query=q, results=search_tickers(q))
