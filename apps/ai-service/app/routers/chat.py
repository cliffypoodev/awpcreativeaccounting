"""Chat-to-invoice endpoint (blueprint §6 capability #1)."""

from __future__ import annotations

import os
import re

from fastapi import APIRouter

from ..models import ChatRequest, ChatResponse, LineItemDraft, ToolCall

router = APIRouter(prefix="/chat", tags=["chat"])

# crude money/qty extractors used by the deterministic stub
_MONEY = re.compile(r"\$?\s*(\d+(?:\.\d{1,2})?)")
_QTY_ITEM = re.compile(r"(\d+)\s+([a-zA-Z][\w \-]+?)(?:\s+(?:at|@|for)\s+\$?\s*(\d+(?:\.\d{1,2})?))?", re.I)


def _stub_parse(text: str) -> ChatResponse:
    """Deterministic intent parse so the stack works with no API key.

    Recognises patterns like: "invoice Acme for 3 logos at $400 and 10 hours at $120".
    """
    items: list[LineItemDraft] = []
    for m in _QTY_ITEM.finditer(text):
        qty = float(m.group(1))
        desc = m.group(2).strip().rstrip(",")
        price = float(m.group(3)) if m.group(3) else 0.0
        if desc.lower() in {"hours", "hour"} and price == 0:
            continue
        items.append(LineItemDraft(description=desc, quantity=qty, unit_price=price))

    client = None
    cm = re.search(r"(?:invoice|bill|charge)\s+([A-Z][\w&. ]+?)(?:\s+for|\s+\$|$)", text)
    if cm:
        client = cm.group(1).strip()

    if not items:
        return ChatResponse(
            reply=(
                "I can draft that. Tell me the client and the line items, e.g. "
                "“invoice Acme for 3 logos at $400 and 10 hours at $120”."
            )
        )

    return ChatResponse(
        reply=f"Drafted {len(items)} line item(s)"
        + (f" for {client}" if client else "")
        + ". Review the totals on the right, then save.",
        tool_call=ToolCall(
            tool="create_invoice",
            arguments={"client_name": client, "items": [i.model_dump() for i in items]},
        ),
        draft_items=items,
    )


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    last_user = next((m.content for m in reversed(req.messages) if m.role == "user"), "")

    if not (os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")):
        return _stub_parse(last_user)

    # >>> LLM: replace this block with a real tool-calling round-trip.
    #   1. send `last_user` + TOOLS to GPT-4o (fallback Claude)
    #   2. if the model emits a create_invoice tool call, map its args to
    #      LineItemDraft[] and return them as draft_items
    #   3. otherwise return the assistant text as `reply`
    # The deterministic parser below is a safe interim until that is wired.
    return _stub_parse(last_user)
