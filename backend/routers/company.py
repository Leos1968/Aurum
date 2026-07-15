"""Company data endpoints."""

from fastapi import APIRouter, HTTPException, Query, Response

from models.schemas import (
    CompanyResponse,
    DcfInputsResponse,
    FinancialsResponse,
    HistoryResponse,
    KeyStatsResponse,
    LboInputsResponse,
    NewsResponse,
)
from services import exporter, market_data

router = APIRouter(prefix="/api/company", tags=["company"])


def _not_found(ticker: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=(
            f"No market data found for '{ticker.strip().upper()}'. "
            "Check the ticker symbol and try again."
        ),
    )


@router.get("/{ticker}", response_model=CompanyResponse)
def get_company(ticker: str) -> CompanyResponse:
    """Live quote snapshot; 404 with a friendly message for bad tickers."""
    snapshot = market_data.get_company_snapshot(ticker)
    if snapshot is None:
        raise _not_found(ticker)
    return CompanyResponse(**snapshot)


@router.get("/{ticker}/history", response_model=HistoryResponse)
def get_history(
    ticker: str,
    range: str = Query(default="1Y", alias="range"),
) -> HistoryResponse:
    """Closing-price series for one chart range (1D/5D/1M/6M/YTD/1Y/5Y/MAX)."""
    history = market_data.get_price_history(ticker, range.upper())
    if history is None:
        raise _not_found(ticker)
    return HistoryResponse(**history)


@router.get("/{ticker}/stats", response_model=KeyStatsResponse)
def get_stats(ticker: str) -> KeyStatsResponse:
    """Fundamental and trading statistics for the Overview tab."""
    stats = market_data.get_key_stats(ticker)
    if stats is None:
        raise _not_found(ticker)
    return KeyStatsResponse(**stats)


@router.get("/{ticker}/financials", response_model=FinancialsResponse)
def get_financials(
    ticker: str,
    statement: str = Query(default="income", pattern="^(income|balance|cash)$"),
) -> FinancialsResponse:
    """Curated annual income statement, balance sheet, or cash flow."""
    financials = market_data.get_financials(ticker, statement)
    if financials is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No {statement} statement data available for "
                f"'{ticker.strip().upper()}'."
            ),
        )
    return FinancialsResponse(**financials)


@router.get("/{ticker}/news", response_model=NewsResponse)
def get_news(ticker: str) -> NewsResponse:
    """Latest headlines for the ticker (may be an empty list)."""
    items = market_data.get_news(ticker)
    if items is None:
        raise _not_found(ticker)
    return NewsResponse(ticker=ticker.strip().upper(), items=items)


@router.get("/{ticker}/dcf", response_model=DcfInputsResponse)
def get_dcf(ticker: str) -> DcfInputsResponse:
    """Fundamental inputs for the interactive DCF valuation model."""
    inputs = market_data.get_dcf_inputs(ticker)
    if inputs is None:
        raise _not_found(ticker)
    return DcfInputsResponse(**inputs)


@router.get("/{ticker}/lbo", response_model=LboInputsResponse)
def get_lbo(ticker: str) -> LboInputsResponse:
    """Fundamental inputs for the interactive LBO model."""
    inputs = market_data.get_lbo_inputs(ticker)
    if inputs is None:
        raise _not_found(ticker)
    return LboInputsResponse(**inputs)


@router.get("/{ticker}/export/xlsx")
def export_excel(ticker: str) -> Response:
    """Formula-driven Excel workbook: DCF model, LBO model, financials."""
    result = exporter.build_excel_model(ticker)
    if result is None:
        raise _not_found(ticker)
    content, filename = result
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{ticker}/export/pdf")
def export_pdf(ticker: str) -> Response:
    """One-page PDF tearsheet with stats, DCF snapshot, and profile."""
    result = exporter.build_pdf_tearsheet(ticker)
    if result is None:
        raise _not_found(ticker)
    content, filename = result
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
