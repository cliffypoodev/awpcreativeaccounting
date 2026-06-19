"""Receipt OCR endpoint (blueprint §6 capability #2)."""

from __future__ import annotations

import os

from fastapi import APIRouter

from ..models import OcrRequest, OcrResponse

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/receipt", response_model=OcrResponse)
async def scan_receipt(req: OcrRequest) -> OcrResponse:
    if not (os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")):
        # Stub: no vision model available. Return an empty, low-confidence shell
        # so the UI can prompt the user to confirm/fill the fields manually.
        return OcrResponse(confidence=0.0, category="uncategorized")

    # >>> LLM: download `req.image_url`, send to a vision model (GPT-4o vision),
    # ask for {vendor, amount, date, category} as strict JSON, parse and return.
    return OcrResponse(confidence=0.0, category="uncategorized")
