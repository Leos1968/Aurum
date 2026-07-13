"""Pydantic response models for the Aurum API.

Field names are snake_case internally and serialize to camelCase for the
TypeScript client via ``serialization_alias``.
"""

from pydantic import BaseModel, Field


class CompanyResponse(BaseModel):
    """Live quote snapshot returned by GET /api/company/{ticker}.

    Monetary fields are in the instrument's native `currency`.
    `change` and `change_percent` are measured against the previous
    session's close.
    """

    ticker: str
    name: str
    price: float
    change: float
    change_percent: float = Field(serialization_alias="changePercent")
    currency: str
    market_cap: float | None = Field(default=None, serialization_alias="marketCap")
    exchange: str | None = None


class PricePoint(BaseModel):
    """One close on the price chart."""

    t: str  # ISO-8601 timestamp
    c: float  # close price


class HistoryResponse(BaseModel):
    """Price history for one chart range."""

    ticker: str
    range_key: str = Field(serialization_alias="range")
    currency: str
    points: list[PricePoint]
    change: float
    change_percent: float = Field(serialization_alias="changePercent")


class KeyStatsResponse(BaseModel):
    """Fundamental and trading statistics for the Overview tab.

    Percentage-style fields (`dividend_yield`, `profit_margin`,
    `return_on_equity`) are expressed in percent, not fractions.
    """

    ticker: str
    currency: str
    trailing_pe: float | None = Field(default=None, serialization_alias="trailingPE")
    forward_pe: float | None = Field(default=None, serialization_alias="forwardPE")
    eps: float | None = None
    dividend_yield: float | None = Field(default=None, serialization_alias="dividendYield")
    beta: float | None = None
    week52_high: float | None = Field(default=None, serialization_alias="week52High")
    week52_low: float | None = Field(default=None, serialization_alias="week52Low")
    volume: float | None = None
    avg_volume: float | None = Field(default=None, serialization_alias="avgVolume")
    revenue: float | None = None
    profit_margin: float | None = Field(default=None, serialization_alias="profitMargin")
    return_on_equity: float | None = Field(default=None, serialization_alias="returnOnEquity")
    free_cash_flow: float | None = Field(default=None, serialization_alias="freeCashFlow")
    sector: str | None = None
    industry: str | None = None
    employees: int | None = None
    website: str | None = None
    summary: str | None = None
    target_mean_price: float | None = Field(default=None, serialization_alias="targetMeanPrice")
    recommendation: str | None = None
    analyst_count: int | None = Field(default=None, serialization_alias="analystCount")


class FinancialRow(BaseModel):
    """One curated line item across the reported periods."""

    label: str
    values: list[float | None]


class FinancialsResponse(BaseModel):
    """A curated annual financial statement."""

    ticker: str
    statement: str  # income | balance | cash
    currency: str
    periods: list[str]
    rows: list[FinancialRow]


class NewsItem(BaseModel):
    """One headline in the news feed."""

    title: str
    publisher: str | None = None
    link: str | None = None
    published: str | None = None  # ISO-8601


class NewsResponse(BaseModel):
    ticker: str
    items: list[NewsItem]


class FcfYear(BaseModel):
    """One year of reported free cash flow."""

    year: int
    value: float


class DcfInputsResponse(BaseModel):
    """Everything the client needs to run an interactive DCF model."""

    ticker: str
    currency: str
    price: float
    shares_outstanding: float | None = Field(default=None, serialization_alias="sharesOutstanding")
    net_debt: float = Field(serialization_alias="netDebt")
    base_fcf: float | None = Field(default=None, serialization_alias="baseFcf")
    fcf_history: list[FcfYear] = Field(default_factory=list, serialization_alias="fcfHistory")
    suggested_growth: float = Field(serialization_alias="suggestedGrowth")
    suggested_terminal: float = Field(serialization_alias="suggestedTerminal")
    suggested_discount: float = Field(serialization_alias="suggestedDiscount")


class StripQuote(BaseModel):
    """A labelled quote on the market tape, sector grid, or watchlist."""

    symbol: str
    label: str
    price: float
    change_percent: float = Field(serialization_alias="changePercent")


class QuoteStripResponse(BaseModel):
    items: list[StripQuote]


class Mover(BaseModel):
    """One row in the gainers/losers/most-active panel."""

    symbol: str
    name: str
    price: float
    change_percent: float = Field(serialization_alias="changePercent")


class MoversResponse(BaseModel):
    kind: str
    items: list[Mover]


class MarketNewsResponse(BaseModel):
    items: list[NewsItem]


class SearchResult(BaseModel):
    """One row in the ticker autocomplete dropdown."""

    symbol: str
    name: str
    exchange: str | None = None
    type: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
