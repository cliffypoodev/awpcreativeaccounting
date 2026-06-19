/**
 * InvoiceForge — shared constants.
 * Single source of truth for plans, statuses, currencies, limits.
 */

// ─── Subscription plans (blueprint §17 Monetization) ──────────────
export const PLANS = {
  free: { name: 'Free', monthly: 0, annualMonthly: 0, invoiceLimit: 3, seats: 1, aiTokens: 0 },
  starter: { name: 'Starter', monthly: 9, annualMonthly: 7, invoiceLimit: Infinity, seats: 1, aiTokens: 50_000 },
  pro: { name: 'Pro', monthly: 19, annualMonthly: 14, invoiceLimit: Infinity, seats: 3, aiTokens: 250_000 },
  business: { name: 'Business', monthly: 39, annualMonthly: 29, invoiceLimit: Infinity, seats: Infinity, aiTokens: 1_000_000 },
  enterprise: { name: 'Enterprise', monthly: null, annualMonthly: null, invoiceLimit: Infinity, seats: Infinity, aiTokens: Infinity },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

// ─── Invoice / estimate statuses ──────────────────────────────────
export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const ESTIMATE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'approved',
  'declined',
  'expired',
  'converted',
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

// ─── Roles (blueprint §13) ────────────────────────────────────────
export const ROLES = ['owner', 'admin', 'member'] as const;
export type Role = (typeof ROLES)[number];

// ─── Invoice / domain events (blueprint §9 tracking) ──────────────
export const INVOICE_EVENT_TYPES = [
  'created',
  'sent',
  'delivered',
  'opened',
  'viewed',
  'downloaded',
  'partially_paid',
  'paid',
  'reminder_sent',
  'cancelled',
  'refunded',
] as const;
export type InvoiceEventType = (typeof INVOICE_EVENT_TYPES)[number];

// ─── Automation triggers + actions (blueprint §5 engine) ──────────
export const AUTOMATION_TRIGGERS = [
  'estimate_approved',
  'invoice_overdue',
  'payment_received',
  'recurring_due',
] as const;
export const AUTOMATION_ACTIONS = [
  'create_invoice',
  'send_reminder',
  'send_receipt',
  'send_thank_you',
] as const;

// ─── PDF templates (blueprint §8) ─────────────────────────────────
export const PDF_TEMPLATES = [
  'classic',
  'modern',
  'professional',
  'contractor',
  'creative',
  'legal',
  'medical',
  'retail',
  'consulting',
  'minimal',
] as const;
export type PdfTemplate = (typeof PDF_TEMPLATES)[number];

// ─── Free SEO tools (blueprint §11 — 20 total) ────────────────────
export const FREE_TOOLS = [
  { slug: 'business-card-generator', name: 'Business Card Generator' },
  { slug: 'business-name-generator', name: 'Business Name Generator' },
  { slug: 'hourly-rate-calculator', name: 'Hourly Rate Calculator' },
  { slug: 'late-payment-interest-calculator', name: 'Late Payment Interest Calculator' },
  { slug: 'logo-maker', name: 'Logo Maker' },
  { slug: 'meeting-cost-calculator', name: 'Meeting Cost Calculator' },
  { slug: 'mileage-calculator', name: 'Mileage Calculator' },
  { slug: 'payment-reminder-generator', name: 'Payment Reminder Generator' },
  { slug: 'profit-margin-calculator', name: 'Profit Margin Calculator' },
  { slug: 'qr-code-generator', name: 'QR Code Generator' },
  { slug: 'receipt-generator', name: 'Receipt Generator' },
  { slug: 'lien-waiver-generator', name: 'Lien Waiver Generator' },
  { slug: 'time-tracker', name: 'Time Tracker' },
  // 7 new (blueprint §11)
  { slug: 'tax-calculator', name: 'Tax Calculator' },
  { slug: 'contract-generator', name: 'Contract Generator' },
  { slug: 'proposal-builder', name: 'Proposal Builder' },
  { slug: 'w9-generator', name: 'W-9 Generator' },
  { slug: 'currency-converter', name: 'Currency Converter' },
  { slug: 'roi-calculator', name: 'ROI Calculator' },
  { slug: 'invoice-number-generator', name: 'Invoice Number Generator' },
] as const;

// ─── Currencies (subset; full ISO-4217 loaded at runtime) ─────────
export const COMMON_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
] as const;

// ─── Rate limits (blueprint security checklist) ───────────────────
export const RATE_LIMITS = {
  auth: { requests: 5, window: '1 m' },
  api: { requests: 100, window: '1 m' },
  ai: { requests: 20, window: '1 m' },
} as const;

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;
