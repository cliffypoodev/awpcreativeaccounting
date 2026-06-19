# InvoiceForge

AI-native invoicing, estimates, and expense tracking — a self-hostable, superior
replacement for invoicer.ai. Built as a Turborepo monorepo.

> **Status: foundation build.** The core domain (calculation engine, schema,
> auth, tRPC CRUD, marketing site, dashboard, live invoice editor) is fully
> implemented and runnable. Higher-level features from the blueprint (Stripe
> billing, R2 storage, full AI tool-calling, all 10 PDF skins, automations) are
> cleanly scaffolded with explicit `TODO` / `>>>` markers showing exactly where
> to extend. See [`invoiceforge-blueprint.md`](./invoiceforge-blueprint.md) for the
> full product spec.

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 15 (App Router), React 19, Tailwind v4, tRPC v11 |
| Data | Postgres 16 + pgvector, Drizzle ORM, Redis |
| Auth | Session (scrypt + HMAC); Better Auth-ready |
| Jobs | BullMQ worker (email, pdf, reminder, recurring) |
| AI | FastAPI service (chat-to-invoice, OCR, forecasting) |
| PDF | React templates → Gotenberg |
| Email | React Email → Resend |

## Monorepo layout

```
apps/
  web/          Next.js app (marketing + dashboard + tRPC API)
  ai-service/   FastAPI AI microservice
  worker/       BullMQ background jobs
packages/
  shared/       Calc engine, Zod schemas, constants, types  ← core IP, unit-tested
  db/           Drizzle schema, migrations, seed, RLS
  email-templates/   React Email templates
  pdf-templates/     React → HTML invoice templates
```

## Quick start

```bash
# 0. prerequisites: Node 22+, pnpm 9+, Docker
corepack enable && corepack prepare pnpm@9.12.0 --activate

# 1. install
pnpm install

# 2. env
cp .env.example .env   # fill in secrets as you wire features

# 3. infra (postgres + redis + gotenberg + mailpit + ai-service)
pnpm docker:up

# 4. database
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. run everything
pnpm dev
```

Web app: <http://localhost:3000> · AI service: <http://localhost:8000/health> ·
Mail UI: <http://localhost:8025>

Demo login after seeding: the seed creates org **AWP Creative Accounting** with an
owner account (see `packages/db/src/seed.ts`).

## The calculation engine

`packages/shared/src/calc.ts` is the single source of truth for money math. It's
used **both** client-side (live editor preview) and server-side (on save), so what
the user sees is exactly what's persisted. It's hardened against NaN/Infinity and
never lets totals go negative. Run its tests:

```bash
pnpm --filter @invoiceforge/shared test
```

## License

See [LICENSE](./LICENSE).
