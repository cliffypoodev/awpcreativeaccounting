# InvoiceForge — Complete Framework, Blueprint & Implementation Stack
## A Superior Replacement for Invoicer.ai

> Reverse-engineered from invoicer.ai's full feature set, architecture, and market positioning.
> Designed to exceed it in performance, extensibility, AI depth, and monetization.

---

## 1. Executive Analysis: What Invoicer.ai Actually Is

### Confirmed Tech Stack (From HTTP Headers & OSINT)

| Layer | Invoicer.ai Uses | Evidence |
|-------|-----------------|----------|
| Marketing Site | **Webflow** | `x-wf-region: us-east-1`, `cdn.prod.website-files.com` |
| Application | **SvelteKit + TypeScript** | `x-sveltekit-page: true`, `/_app/immutable/` paths |
| CDN/Security | **Cloudflare** | `server: cloudflare`, CF-Ray headers |
| Payments | **Stripe** | Verified Stripe Partner badge |
| Auth | Email/password + Google OAuth | Login page analysis |
| Help Center | **Intercom** | `help.invoicer.ai` subdomain |
| Analytics | Bing Ads + GA | Tracking pixels in footer |

### Complete Feature Inventory

**Core Product:** Invoice generator (manual + AI chat), estimate/quote generator, receipt generator, expense manager with AI OCR, AI assistant, client management (unlimited), Stripe payments (cards, Apple Pay, Google Pay, 135+ currencies), real-time tracking (delivered/viewed/paid), automated reminders, multiple discounts/deposits, estimate-to-invoice conversion, recurring invoices, PDF download, file attachments, custom branding, multi-user (1-3 seats), enterprise embeddable editor.

**13 Free SEO Tools:** Business Card Generator, Business Name Generator, Hourly Rate Calculator, Late Payment Interest Calculator, Logo Maker, Meeting Cost Calculator, Mileage Calculator, Payment Reminder Generator, Profit Margin Calculator, QR Code Generator, Receipt Generator, Lien Waiver Generator, Time Tracker.

**Content/SEO:** 9 industry landing pages, template downloads (Word/Excel/Docs/Sheets/PDF/ODF), blog, glossary, help center.

### Pricing: Basic $10/mo, Pro $19/mo, Advanced $29/mo, Enterprise custom.

---

## 2. Architecture: Why Ours Is Better

### Problems With Invoicer.ai
1. **Webflow for marketing** = vendor lock-in, limited dynamic content, separate CMS cost
2. **Separate domains** (invoicer.ai vs app.invoicer.ai) = auth friction, SEO authority split
3. **SvelteKit monolith** = scaling bottleneck, smaller hiring pool vs React
4. **No public API** = no ecosystem, no integrations beyond Stripe
5. **No mobile app** = responsive web only, no offline
6. **Limited AI** = chat-to-invoice only, no analytics/forecasting

### InvoiceForge Architecture

```
┌─────────────────────────────────────────────────┐
│                  CLOUDFLARE                      │
│  CDN · WAF · DDoS · Edge Caching · Workers      │
└────────────────┬────────────────────────────────┘
                 │
   ┌─────────────┼──────────────┐
   │             │              │
   ▼             ▼              ▼
┌────────┐ ┌─────────┐  ┌───────────┐
│Next.js │ │  tRPC   │  │  AI Svc   │
│  15    │ │  API    │  │  FastAPI  │
│(SSR)   │ │ Server  │  │ (Python)  │
└───┬────┘ └────┬────┘  └─────┬─────┘
    └────────────┼─────────────┘
                 │
   ┌─────────────┼──────────────┐
   ▼             ▼              ▼
┌────────┐ ┌─────────┐  ┌──────────┐
│Postgres│ │  Redis  │  │Cloudflare│
│+pgvec  │ │ Cache/Q │  │   R2     │
└────────┘ └─────────┘  └──────────┘
                 │
   ┌─────────────┼──────────────┐
   ▼             ▼              ▼
┌────────┐ ┌─────────┐  ┌──────────┐
│ Stripe │ │ Resend  │  │ BullMQ   │
│  API   │ │ (Email) │  │ Workers  │
└────────┘ └─────────┘  └──────────┘
```

| Decision | Choice | Advantage |
|----------|--------|-----------|
| Unified domain | Single Next.js serves marketing + app | No auth friction, unified SEO |
| API-first | tRPC + REST | Mobile apps, integrations, enterprise API |
| AI microservice | Python FastAPI | GPU scaling, ML ecosystem |
| Edge rendering | Cloudflare + ISR | <100ms TTFB vs Webflow's ~300ms |

---

## 3. Tech Stack

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | **Next.js 15** (App Router) — replaces both Webflow + SvelteKit |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** |
| Components | **shadcn/ui** + **Radix UI** |
| State | **Zustand** + **TanStack Query v5** |
| Forms | **React Hook Form** + **Zod** |
| PDF Viewer | **react-pdf** |
| Rich Text | **Tiptap** |
| Charts | **Recharts** |
| Animations | **Framer Motion** |

### Backend
| Component | Technology |
|-----------|-----------|
| Runtime | **Node.js 22 LTS** |
| API | **tRPC v11** + Next.js API Routes |
| ORM | **Drizzle ORM** (faster than Prisma, edge-compatible) |
| Auth | **Better Auth** (email, OAuth, magic links, passkeys) |
| Jobs | **BullMQ** (Redis-backed) |
| Rate Limiting | **Upstash Ratelimit** |

### AI Service
| Component | Technology |
|-----------|-----------|
| Framework | **FastAPI** |
| LLM | **GPT-4o** + **Claude** fallback |
| OCR | **Google Document AI** or **AWS Textract** |
| Orchestration | **LangChain** + **LangGraph** |
| Embeddings | **text-embedding-3-small** + **pgvector** |
| Structured Output | **Instructor** (Pydantic) |

### Database & Storage
| Component | Technology |
|-----------|-----------|
| Primary DB | **PostgreSQL 16** + **pgvector** |
| Cache/Queue | **Redis 7** (Upstash) |
| Storage | **Cloudflare R2** (zero egress) |
| Search | **pg_trgm** + Full Text Search |

### Email & PDF
| Component | Technology |
|-----------|-----------|
| Email | **Resend** + **React Email** templates |
| PDF | **Gotenberg** (primary) or **@react-pdf/renderer** |

### Payments
| Component | Technology |
|-----------|-----------|
| Processor | **Stripe** (Checkout, Billing, Connect) |

### DevOps
| Component | Technology |
|-----------|-----------|
| Hosting | **Vercel** (Next.js) + **Fly.io** (AI, workers) |
| CDN | **Cloudflare** |
| CI/CD | **GitHub Actions** |
| Monitoring | **Sentry** + **Axiom** + **Checkly** |
| Analytics | **PostHog** (self-hostable) |

---

## 4. Database Schema (Drizzle ORM)

### Entity Map
```
organizations ─┬─ users (members)
               ├─ clients
               ├─ invoices ── items, discounts, deposits, attachments, events
               ├─ estimates ── items, discounts, events
               ├─ expenses ── attachments
               ├─ templates
               ├─ automations
               └─ ai_conversations
```

### Core Tables

```typescript
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  logo_url: text('logo_url'),
  brand_color: varchar('brand_color', { length: 7 }).default('#000000'),
  address: jsonb('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 500 }),
  tax_id: varchar('tax_id', { length: 100 }),
  default_currency: varchar('default_currency', { length: 3 }).default('USD'),
  default_tax_rate: decimal('default_tax_rate', { precision: 5, scale: 2 }),
  default_payment_terms: integer('default_payment_terms').default(30),
  default_notes: text('default_notes'),
  default_terms: text('default_terms'),
  stripe_customer_id: varchar('stripe_customer_id', { length: 255 }),
  stripe_subscription_id: varchar('stripe_subscription_id', { length: 255 }),
  stripe_connect_account_id: varchar('stripe_connect_account_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).default('free'),
  ai_tokens_used: integer('ai_tokens_used').default(0),
  ai_tokens_limit: integer('ai_tokens_limit').default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  password_hash: text('password_hash'),
  avatar_url: text('avatar_url'),
  role: varchar('role', { length: 20 }).default('member'),
  email_verified: boolean('email_verified').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  company: varchar('company', { length: 255 }),
  address: jsonb('address'),
  notes: text('notes'),
  total_invoiced: decimal('total_invoiced', { precision: 12, scale: 2 }).default('0'),
  total_paid: decimal('total_paid', { precision: 12, scale: 2 }).default('0'),
  total_outstanding: decimal('total_outstanding', { precision: 12, scale: 2 }).default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  client_id: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft'),
  // draft|sent|viewed|partially_paid|paid|overdue|cancelled|refunded
  issue_date: date('issue_date').notNull(),
  due_date: date('due_date').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
  tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  discount_amount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).default('0'),
  amount_paid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0'),
  amount_due: decimal('amount_due', { precision: 12, scale: 2 }).default('0'),
  notes: text('notes'),
  terms: text('terms'),
  template_id: uuid('template_id'),
  from_estimate_id: uuid('from_estimate_id'),
  payment_link_token: varchar('payment_link_token', { length: 64 }).unique(),
  view_token: varchar('view_token', { length: 64 }).unique(),
  is_recurring: boolean('is_recurring').default(false),
  recurring_schedule: jsonb('recurring_schedule'),
  sent_at: timestamp('sent_at'),
  viewed_at: timestamp('viewed_at'),
  paid_at: timestamp('paid_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 4 }).default('1'),
  unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  tax_rate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  sort_order: integer('sort_order').default(0),
});

export const invoiceDiscounts = pgTable('invoice_discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }),
  type: varchar('type', { length: 10 }).notNull(), // percentage|fixed
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

export const invoiceDeposits = pgTable('invoice_deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paid_at: timestamp('paid_at'),
  stripe_payment_id: varchar('stripe_payment_id', { length: 255 }),
});

export const invoiceEvents = pgTable('invoice_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  event_type: varchar('event_type', { length: 30 }).notNull(),
  metadata: jsonb('metadata'),
  occurred_at: timestamp('occurred_at').defaultNow().notNull(),
});

export const invoiceAttachments = pgTable('invoice_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  file_url: text('file_url').notNull(),
  file_size: integer('file_size'),
  mime_type: varchar('mime_type', { length: 100 }),
});

// estimates, estimate_items, estimate_discounts, estimate_events
// — mirror invoice structure with: expiry_date, approval_token, converted_invoice_id

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }),
  vendor: varchar('vendor', { length: 255 }),
  description: text('description'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  date: date('date').notNull(),
  receipt_url: text('receipt_url'),
  receipt_data: jsonb('receipt_data'),
  tax_deductible: boolean('tax_deductible').default(false),
  client_id: uuid('client_id').references(() => clients.id),
});

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  is_system: boolean('is_system').default(false),
  config: jsonb('config').notNull(),
});

export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  trigger: varchar('trigger', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  config: jsonb('config'),
  is_active: boolean('is_active').default(true),
});

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id),
  messages: jsonb('messages').notNull(),
  tokens_used: integer('tokens_used').default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 5. Core Modules

### Invoice Generator
**Manual:** Form with dynamic line items, real-time calc engine (subtotal → tax → discounts → deposits → amount_due), live PDF preview, save draft or send.

**AI Chat:** User types natural language → FastAPI parses intent → extracts entities → matches/creates client → returns structured JSON → renders in editor.

### Estimate Generator
Same editor + expiry date + approval workflow. Client-facing `/approve/{token}` page. One-click convert to invoice. Automation: approved → auto-invoice.

### Expense Manager
Manual entry + AI receipt OCR. Category auto-tagging. Link to clients/invoices. CSV/PDF export. Dashboard with category/trend breakdowns.

### Dashboard
Revenue/outstanding/overdue KPIs, revenue chart (30/90/365d), recent activity, upcoming payments, **AI Insights** (new): overdue alerts, revenue forecasts, client re-engagement suggestions.

### Automation Engine
Triggers: estimate_approved, invoice_overdue, payment_received, recurring_due.
Actions: create_invoice, send_reminder, send_receipt, send_thank_you.

---

## 6. AI Engine

### Capabilities vs Invoicer.ai

| # | Capability | Invoicer.ai | InvoiceForge |
|---|-----------|-------------|-------------|
| 1 | Chat-to-invoice | Yes | Yes (improved) |
| 2 | Receipt OCR | Yes | Yes (improved) |
| 3 | Pricing suggestions | Yes | Yes (improved) |
| 4 | Predictive cash flow | No | **Yes** |
| 5 | Smart payment reminders | No | **Yes** |
| 6 | Expense auto-categorization | No | **Yes** |
| 7 | Client intelligence | No | **Yes** |
| 8 | Revenue forecasting | No | **Yes** |
| 9 | Anomaly detection | No | **Yes** |
| 10 | Natural language queries | No | **Yes** |
| 11 | Multi-language invoices | No | **Yes** |

### LLM Tool Definitions

```python
tools = [
    {"name": "create_invoice", "params": {"client_name", "items[]", "tax_rate", "due_date", "currency"}},
    {"name": "create_estimate", "params": {"client_name", "items[]", "expiry_date"}},
    {"name": "suggest_pricing", "params": {"service_description", "location"}},
    {"name": "query_financials", "params": {"query_type", "date_range", "client_id"}},
    {"name": "scan_receipt", "params": {"image_url"}},
    {"name": "forecast_cashflow", "params": {"period"}},
    {"name": "draft_reminder", "params": {"invoice_id", "tone"}},
]
```

---

## 7. Payments

**SaaS billing:** Stripe Checkout → subscription webhooks → plan activation/renewal.

**Invoice payments:** "Pay Now" button → `/pay/{token}` → Stripe Checkout session → webhook → mark paid → trigger automations (receipt, thank you).

---

## 8. PDF Pipeline

```
Invoice JSON → React Template Component → HTML → Gotenberg → PDF
  → Upload to R2 → attach to email → stream to browser
```

**10 templates:** Classic, Modern, Professional, Contractor, Creative, Legal, Medical, Retail, Consulting, Minimal.

---

## 9. Real-Time Tracking

```
SEND → email w/ /view/{token}
DELIVER → Resend webhook → event logged
OPEN → Resend pixel → event logged
VIEW → Client clicks link → event + WebSocket notification
DOWNLOAD → Event logged
PAY → Stripe webhook → event + status update + notification
```

---

## 10. Email System

React Email templates via Resend. Types: invoice sent, estimate sent, payment reminder (escalation ladder), payment received/receipt, estimate approved, welcome, password reset. BullMQ queue for reliable delivery.

---

## 11. Free Tools (SEO)

All 13 from Invoicer.ai + 7 new = **20 total.** All client-side (zero backend cost).

New additions: Tax Calculator, Contract Generator, Proposal Builder, W-9 Generator, Currency Converter, ROI Calculator, Invoice Number Generator.

Each at `/tools/{slug}` with interactive widget + 800-1200 words SEO content + Schema.org markup.

---

## 12. Marketing Site

All served by Next.js (no Webflow). Pages: homepage, pricing, feature pages, industries (15+), templates, tools (20), blog, glossary, about, contact, enterprise, legal.

ISR strategy: marketing 1hr, blog 24hr, tools static, app SSR.

---

## 13. Auth & Multi-Tenancy

Methods: email/password, Google, GitHub, Microsoft OAuth, magic links, passkeys, 2FA TOTP.

Organization-based tenancy. All queries scoped by org_id. PostgreSQL RLS. Roles: owner/admin/member.

---

## 14. API Design

**Internal:** tRPC routers for auth, org, client, invoice, estimate, expense, ai, template, automation, dashboard, payment, public.

**External (enterprise):** REST API at `/api/v1/*` with API key auth and rate limiting.

---

## 15. DevOps

**Monorepo:** Turborepo + pnpm. Apps: web (Next.js), ai-service (FastAPI), worker (BullMQ). Packages: db, shared, email-templates, pdf-templates, ui, config.

**Local dev:** Docker Compose with PostgreSQL+pgvector, Redis, Gotenberg, Mailpit, AI service.

**Production:** Vercel (web) + Fly.io (AI, workers) + Cloudflare (CDN).

---

## 16. Improvements Over Invoicer.ai

| Area | Invoicer.ai | InvoiceForge |
|------|------------|-------------|
| API | None | Full REST + tRPC |
| Integrations | Stripe only | + QuickBooks, Xero, Zapier |
| Mobile | Responsive only | PWA + offline + push |
| AI | Basic chat | Full financial assistant |
| Users | 1-3 max | Unlimited + RBAC |
| Templates | ~4 | 10+ + custom builder |
| Reporting | Basic | Revenue/profitability/aging/tax |
| Export | PDF only | PDF, CSV, JSON, QBO, Xero |
| i18n | Currency only | Multi-language + locale + RTL |
| Webhooks | None | Outgoing webhooks |
| Security | Basic | 2FA, passkeys, audit logs |
| Free Tier | None | 3 invoices/month (lower barrier) |
| Client Portal | View-only link | Full portal |
| Time Tracking | Separate tool | Built-in → auto-invoice |

### Performance Targets
| Metric | Invoicer.ai | InvoiceForge |
|--------|------------|-------------|
| TTFB (home) | ~300ms | <100ms |
| TTFB (app) | ~400ms | <200ms |
| PDF gen | ~3-5s | <1.5s |
| AI response | ~5-8s | <3s (streaming) |
| Lighthouse | ~75-85 | 95+ |

---

## 17. Monetization

| Tier | Monthly | Annual/mo |
|------|---------|-----------|
| Free | $0 | — |
| Starter | $9 | $7 |
| Pro | $19 | $14 |
| Business | $39 | $29 |
| Enterprise | Custom | Custom |

Revenue streams: SaaS subscriptions, payment processing fee, AI token overages, template marketplace, enterprise licensing.

---

## 18. Roadmap (30 Weeks)

**Phase 1 (Wk 1-6):** Monorepo, DB, auth, clients, invoice/estimate editors, PDF, email, dashboard, Stripe billing.

**Phase 2 (Wk 7-10):** Invoice payments, tracking, reminders, estimate conversion, discounts/deposits.

**Phase 3 (Wk 11-14):** AI service, chat-to-invoice, receipt OCR, expense manager.

**Phase 4 (Wk 15-18):** Marketing pages, pricing, industries, free tools, SEO, blog.

**Phase 5 (Wk 19-24):** Automations, recurring, client portal, time tracker, reports, PWA, webhooks, REST API.

**Phase 6 (Wk 25-30):** AI forecasting, enterprise SSO, embeddable editor, marketplace, 2FA, performance.

---

## 19. Directory Structure

```
invoiceforge/
├── apps/
│   ├── web/                        # Next.js 15
│   │   ├── app/
│   │   │   ├── (marketing)/        # Public pages
│   │   │   │   ├── page.tsx, pricing/, about/, contact/
│   │   │   │   ├── industries/[slug]/
│   │   │   │   ├── tools/[tool]/
│   │   │   │   ├── invoice-template/, blog/[slug]/, glossary/[term]/
│   │   │   │   └── enterprise/, privacy/, terms/
│   │   │   ├── (auth)/             # login/, signup/, forgot-password/
│   │   │   ├── (app)/              # Protected routes
│   │   │   │   ├── dashboard/, invoices/(new,[id]/edit)
│   │   │   │   ├── estimates/, clients/[id]/, expenses/
│   │   │   │   ├── reports/, automations/, templates/
│   │   │   │   ├── settings/(profile,org,branding,payments,members,billing)
│   │   │   │   └── ai/
│   │   │   ├── (public)/           # view/[token]/, pay/[token]/, approve/[token]/
│   │   │   └── api/                # trpc/, webhooks/, v1/, pdf/, tracking/
│   │   ├── components/             # invoice-editor/, ai-chat/, dashboard/, shared/
│   │   ├── lib/                    # trpc, auth, stripe, calculations, currency
│   │   └── server/                 # routers/, services/, jobs/
│   ├── ai-service/                 # Python FastAPI
│   │   └── app/ (main, routers/, agents/, models/, services/)
│   └── worker/                     # BullMQ job runner
│       └── src/ (processors: email, pdf, reminder, recurring)
├── packages/
│   ├── db/                         # Drizzle schema, migrations, seed
│   ├── shared/                     # Zod schemas, types, constants, utils
│   ├── email-templates/            # React Email (7 templates)
│   ├── pdf-templates/              # Invoice PDF components (10 templates)
│   ├── ui/                         # shadcn component library
│   └── config/                     # ESLint, TS, Tailwind
├── docker/                         # Compose files, Dockerfiles
├── .github/workflows/              # CI, deploy-web, deploy-ai, deploy-worker
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 20. Cost Estimation

### Infrastructure (1,000 users)

| Service | Cost/mo |
|---------|---------|
| Vercel Pro | $20 |
| Fly.io (AI + worker) | $22 |
| PostgreSQL (Neon/Supabase) | $25 |
| Redis (Upstash) | $10 |
| Cloudflare R2 | $5 |
| Resend (email) | $20 |
| Gotenberg (Fly) | $7 |
| Sentry | $26 |
| OpenAI API | $100-300 |
| **Total** | **$250-450** |

### Development
Solo: 6-9 months + ~$250/mo infra.
Team: ~30 weeks, $130-205K outsourced.

---

## Appendix: Invoice Calculation Engine

```typescript
export function calculateInvoice(
  items: { quantity: number; unitPrice: number; taxRate: number }[],
  discounts: { type: 'percentage' | 'fixed'; value: number }[],
  deposits: number[]
) {
  const subtotal = items.reduce((s, i) => s + round(i.quantity * i.unitPrice), 0);
  const taxAmount = items.reduce((s, i) =>
    s + round(i.quantity * i.unitPrice * (i.taxRate / 100)), 0);
  const discountAmount = discounts.reduce((s, d) =>
    d.type === 'percentage' ? s + round(subtotal * (d.value / 100)) : s + d.value, 0);
  const depositsTotal = deposits.reduce((s, d) => s + d, 0);
  const total = round(subtotal + taxAmount - discountAmount);
  const amountDue = round(total - depositsTotal);
  return { subtotal, taxAmount, discountAmount, depositsTotal, total, amountDue };
}
const round = (n: number) => Math.round(n * 100) / 100;
```

## Appendix: Security Checklist

- All API routes require auth (except public views)
- RLS enforced — org_id scoping on all queries
- CSRF protection, rate limiting (auth: 5/min, API: 100/min)
- Zod validation on all inputs (server-side)
- Parameterized queries (Drizzle ORM)
- CSP headers, X-Frame-Options: DENY, HSTS
- bcrypt (cost 12), API key SHA-256 hashing
- Stripe + Resend webhook signature verification
- File upload validation (type, size, content)
- Complete audit logging
- Dependency scanning (Renovate)

---

*Version 1.0 — June 19, 2026*
