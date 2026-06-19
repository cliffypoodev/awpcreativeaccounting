"""Shared schemas + LLM tool definitions (blueprint §6)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ─── Tool definitions (mirror blueprint §6 verbatim in intent) ──────────────
TOOLS = [
    {
        "name": "create_invoice",
        "description": "Create a draft invoice from natural language.",
        "params": ["client_name", "items[]", "tax_rate", "due_date", "currency"],
    },
    {
        "name": "create_estimate",
        "description": "Create a draft estimate/quote.",
        "params": ["client_name", "items[]", "expiry_date"],
    },
    {
        "name": "suggest_pricing",
        "description": "Suggest market pricing for a described service.",
        "params": ["service_description", "location"],
    },
    {
        "name": "query_financials",
        "description": "Answer a natural-language question about the books.",
        "params": ["query_type", "date_range", "client_id"],
    },
    {
        "name": "scan_receipt",
        "description": "OCR a receipt image into a structured expense.",
        "params": ["image_url"],
    },
    {
        "name": "forecast_cashflow",
        "description": "Predict cash flow for an upcoming period.",
        "params": ["period"],
    },
    {
        "name": "draft_reminder",
        "description": "Draft a payment-reminder email in a given tone.",
        "params": ["invoice_id", "tone"],
    },
]


# ─── Request / response models ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    org_id: str
    messages: list[ChatMessage]


class LineItemDraft(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    tax_rate: float = 0


class ToolCall(BaseModel):
    tool: str
    arguments: dict


class ChatResponse(BaseModel):
    reply: str
    tool_call: Optional[ToolCall] = None
    draft_items: list[LineItemDraft] = Field(default_factory=list)


class OcrRequest(BaseModel):
    image_url: str


class OcrResponse(BaseModel):
    vendor: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    category: Optional[str] = None
    confidence: float = 0.0


class ForecastRequest(BaseModel):
    org_id: str
    period: Literal["30d", "90d", "365d"] = "90d"
    # Caller supplies recent paid + outstanding history so the service stays stateless.
    paid_history: list[float] = Field(default_factory=list)
    outstanding: float = 0.0


class ForecastResponse(BaseModel):
    period: str
    projected_inflow: float
    confidence: Literal["low", "medium", "high"]
    note: str
