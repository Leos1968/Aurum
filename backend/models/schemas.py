"""Pydantic response models for the Aurum API."""

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
