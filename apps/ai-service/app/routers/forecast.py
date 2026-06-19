"""Cash-flow forecasting endpoint (blueprint §6 capability #4/#8).

This one is genuinely useful WITHOUT an LLM: it's a simple, transparent
moving-average projection over supplied paid history plus expected collection
of current outstanding. The LLM is only needed for narrative phrasing, so the
math runs the same in stub or live mode.
"""

from __future__ import annotations

from fastapi import APIRouter

from ..models import ForecastRequest, ForecastResponse

router = APIRouter(prefix="/forecast", tags=["forecast"])

_DAYS = {"30d": 30, "90d": 90, "365d": 365}


@router.post("/cashflow", response_model=ForecastResponse)
async def forecast_cashflow(req: ForecastRequest) -> ForecastResponse:
    history = [h for h in req.paid_history if h >= 0]
    days = _DAYS[req.period]

    if history:
        avg = sum(history) / len(history)
    else:
        avg = 0.0

    # Project: per-period average scaled to horizon, plus a conservative 70%
    # expected collection of what's currently outstanding.
    periods = max(1, days // 30)
    projected = round(avg * periods + req.outstanding * 0.7, 2)

    if len(history) >= 6:
        confidence = "high"
    elif len(history) >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    note = (
        f"Based on {len(history)} months of paid history "
        f"(avg {avg:,.2f}/mo) and 70% expected collection of "
        f"{req.outstanding:,.2f} outstanding."
    )

    return ForecastResponse(
        period=req.period,
        projected_inflow=projected,
        confidence=confidence,
        note=note,
    )
