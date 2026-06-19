# ai-service

FastAPI microservice for InvoiceForge's AI layer (blueprint §6).

## Run locally

```bash
cd apps/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`GET /health` reports whether it's in **live** mode (an API key is present) or
**stub** mode (deterministic, no spend).

## Endpoints

| Route | Purpose |
|-------|---------|
| `POST /chat` | Chat-to-invoice intent parsing → draft line items |
| `POST /ocr/receipt` | Receipt image → structured expense |
| `POST /forecast/cashflow` | Moving-average cash-flow projection |

## Wiring real inference

Set `OPENAI_API_KEY` (primary) and/or `ANTHROPIC_API_KEY` (fallback), then
replace the blocks marked `# >>> LLM` in the routers with real tool-calling
round-trips. The request/response contracts in `app/models.py` do not change.
