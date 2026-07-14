"""Market-wide dashboard endpoints: tape, sectors, movers, and news."""

from fastapi import APIRouter, HTTPException, Query

from models.schemas import (
    CompsResponse,
    MarketNewsResponse,
    MoversResponse,
    QuoteStripResponse,
)
from services import market_data

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/tape", response_model=QuoteStripResponse)
def get_tape() -> QuoteStripResponse:
    """Index, commodity, and crypto quotes for the top-of-app tape."""
    return QuoteStripResponse(items=market_data.get_market_tape())


@router.get("/sectors", response_model=QuoteStripResponse)
def get_sectors() -> QuoteStripResponse:
    """Day performance of the 11 S&P sector ETFs."""
    return QuoteStripResponse(items=market_data.get_sector_performance())


@router.get("/quotes", response_model=QuoteStripResponse)
def get_quotes(symbols: str = Query(min_length=1, max_length=300)) -> QuoteStripResponse:
    """Live quotes for a comma-separated symbol list (watchlist rows)."""
    return QuoteStripResponse(items=market_data.get_watch_quotes(symbols.split(",")))


@router.get("/movers", response_model=MoversResponse)
def get_movers(
    kind: str = Query(default="gainers", pattern="^(gainers|losers|actives)$"),
) -> MoversResponse:
    """Top gainers, losers, or most-active stocks from Yahoo's screener."""
    movers = market_data.get_movers(kind)
    if movers is None:
        raise HTTPException(status_code=503, detail="Screener data is unavailable right now.")
    return MoversResponse(kind=kind, items=movers)


@router.get("/comps", response_model=CompsResponse)
def get_comps(symbols: str = Query(min_length=1, max_length=200)) -> CompsResponse:
    """Trading multiples for a comma-separated ticker list (comps table)."""
    return CompsResponse(rows=market_data.get_comps(symbols.split(",")))


@router.get("/news", response_model=MarketNewsResponse)
def get_market_news() -> MarketNewsResponse:
    """General market headlines."""
    items = market_data.get_market_news()
    return MarketNewsResponse(items=items or [])
