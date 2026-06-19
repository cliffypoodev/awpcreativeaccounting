"""
InvoiceForge — AI Service (FastAPI)

A thin, self-contained microservice that wraps the LLM tool layer described in
blueprint §6. It speaks JSON to the Next.js app over HTTP. The LLM provider is
pluggable: set OPENAI_API_KEY (primary) and/or ANTHROPIC_API_KEY (fallback).

If no key is present the service runs in DETERMINISTIC STUB MODE so the whole
stack boots and the contract is exercisable without spend. Swap in the real
client where marked `# >>> LLM`.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import chat, forecast, ocr

API_KEY_PRESENT = bool(os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.llm_enabled = API_KEY_PRESENT
    yield


app = FastAPI(
    title="InvoiceForge AI Service",
    version="1.0.0",
    description="Chat-to-invoice, receipt OCR, pricing, and cash-flow forecasting.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(ocr.router)
app.include_router(forecast.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "llm_enabled": API_KEY_PRESENT, "mode": "live" if API_KEY_PRESENT else "stub"}
