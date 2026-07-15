/**
 * AWP Creative — shared API contracts (single source of truth).
 * Both backend routes and the webapp import from this file.
 *
 * Ported from the original InvoiceForge monorepo:
 *  - calculation engine (packages/shared/src/calc.ts)
 *  - constants (packages/shared/src/constants.ts)
 *  - Zod schemas (packages/shared/src/schemas.ts)
 */
import { z } from "zod";

// ─── Calculation engine (deterministic money math) ────────────────
export const round = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export interface CalcLineItem {
  quantity: number;
  unitPrice: number;
  taxRate: number;
}
export type DiscountType = "percentage" | "fixed";
export interface CalcDiscount {
  type: DiscountType;
  value: number;
}
export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  depositsTotal: number;
  total: number;
  amountDue: number;
}

/**
 * Calculate full invoice totals. Hardened for edge cases:
 *  - negative / NaN inputs coerced to 0
 *  - discounts never push total below 0
 *  - amountDue never goes negative (overpayment clamps to 0)
 */
export function calculateInvoice(
  items: CalcLineItem[],
  discounts: CalcDiscount[] = [],
  deposits: number[] = []
): InvoiceTotals {
  const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

  const subtotal = round(
    items.reduce(
      (sum, item) => sum + round(safe(item.quantity) * safe(item.unitPrice)),
      0
    )
  );

  const taxAmount = round(
    items.reduce(
      (sum, item) =>
        sum +
        round(safe(item.quantity) * safe(item.unitPrice) * (safe(item.taxRate) / 100)),
      0
    )
  );

  const discountAmount = round(
    discounts.reduce((sum, d) => {
      if (d.type === "percentage") return sum + round(subtotal * (safe(d.value) / 100));
      return sum + safe(d.value);
    }, 0)
  );

  const depositsTotal = round(deposits.reduce((sum, d) => sum + safe(d), 0));
  const total = Math.max(0, round(subtotal + taxAmount - discountAmount));
  const amountDue = Math.max(0, round(total - depositsTotal));

  return { subtotal, taxAmount, discountAmount, depositsTotal, total, amountDue };
}

export const lineAmount = (quantity: number, unitPrice: number): number =>
  round((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0));

export const paymentProgress = (total: number, amountPaid: number): number => {
  if (total <= 0) return 0;
  return Math.min(100, round((amountPaid / total) * 100));
};

// ─── Constants ────────────────────────────────────────────────────
export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const ESTIMATE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "approved",
  "declined",
  "expired",
  "converted",
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
] as const;

export const currencySymbol = (code: string): string =>
  COMMON_CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";

export const EXPENSE_CATEGORIES = [
  "Software",
  "Hardware",
  "Travel",
  "Meals",
  "Office",
  "Marketing",
  "Contractors",
  "Utilities",
  "Other",
] as const;

// ─── Phase 3: Project costs + profitability + cash flow ──────────
export const PROJECT_COST_CATEGORIES = [
  "gear_rental",
  "talent_fees",
  "contractor_hours",
  "insurance",
  "misc",
] as const;
export type ProjectCostCategory = (typeof PROJECT_COST_CATEGORIES)[number];

export const COST_CATEGORY_LABELS: Record<string, string> = {
  gear_rental: "Gear rental",
  talent_fees: "Talent / VO fees",
  contractor_hours: "Contractor hours",
  insurance: "Insurance",
  misc: "Miscellaneous",
};

export const projectCostInput = z.object({
  projectId: z.string(),
  category: z.enum(PROJECT_COST_CATEGORIES),
  description: z.string().max(255).optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  date: z.string(),
  notes: z.string().optional().nullable(),
});
export type ProjectCostInput = z.infer<typeof projectCostInput>;

export interface ProjectCostRow {
  id: string;
  projectId: string;
  category: string;
  description: string | null;
  amount: number;
  currency: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface ProjectProfitabilityRow {
  projectId: string;
  projectName: string;
  referenceCode: string;
  serviceType: string;
  clientName: string | null;
  status: string;
  totalBilled: number;
  totalPaid: number;
  totalCosts: number;
  grossMargin: number;
  grossMarginPct: number;
  currency: string;
}

export interface ServiceLineSummaryRow {
  serviceType: string;
  totalBilled: number;
  totalCosts: number;
  grossMargin: number;
  grossMarginPct: number;
  projectCount: number;
}

export interface CashFlowItem {
  date: string;
  label: string;
  amount: number;
  currency: string;
  type: "overdue" | "invoice_due" | "recurring_expected";
  referenceId: string;
  referenceNumber: string;
}

export interface CashFlowForecast {
  overdueTotal: number;
  next30Days: number;
  next60Days: number;
  next90Days: number;
  items: CashFlowItem[];
}

// ─── Phase 4: Asset / deliverable catalog ─────────────────────────
export const ASSET_TYPES = [
  "final_video",
  "voiceover_take",
  "podcast_episode",
  "drone_footage",
  "photo",
  "graphic",
  "other",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<string, string> = {
  final_video: "Final video",
  voiceover_take: "Voiceover take",
  podcast_episode: "Podcast episode",
  drone_footage: "Drone footage",
  photo: "Photo",
  graphic: "Graphic",
  other: "Other",
};

/** Short uppercase codes used in the consistent file-naming scheme. */
export const ASSET_TYPE_CODES: Record<string, string> = {
  final_video: "VID",
  voiceover_take: "VO",
  podcast_episode: "POD",
  drone_footage: "DRN",
  photo: "PHO",
  graphic: "GFX",
  other: "AST",
};

export const DELIVERABLE_STATUSES = ["draft", "in_review", "approved", "delivered"] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  delivered: "Delivered",
};

/**
 * Consistent naming convention for catalogued assets:
 *   <REFERENCE-CODE>_<TYPE-CODE>_v<VERSION>
 * e.g. AWP-0007_VID_v2. Deterministic — same inputs always yield the same name.
 */
export function suggestDeliverableName(
  referenceCode: string,
  assetType: string,
  version: number
): string {
  const ref = (referenceCode || "ASSET").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const code = ASSET_TYPE_CODES[assetType] ?? "AST";
  const v = Number.isFinite(version) && version > 0 ? Math.floor(version) : 1;
  return `${ref}_${code}_v${v}`;
}

export const deliverableInput = z.object({
  projectId: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  name: z.string().max(255).optional().nullable(),
  assetType: z.enum(ASSET_TYPES),
  status: z.enum(DELIVERABLE_STATUSES).optional().default("draft"),
  fileUrl: z.string().max(1000).optional().nullable(),
  fileFormat: z.string().max(40).optional().nullable(),
  fileSize: z.string().max(40).optional().nullable(),
  version: z.number().int().min(1).max(9999).optional(),
  deliveredAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
});
export type DeliverableInput = z.infer<typeof deliverableInput>;

export interface DeliverableRow {
  id: string;
  orgId: string;
  projectId: string;
  project: { id: string; name: string; referenceCode: string; serviceType: string } | null;
  invoiceId: string | null;
  invoice: { id: string; number: string } | null;
  name: string;
  assetType: string;
  status: string;
  fileUrl: string | null;
  fileFormat: string | null;
  fileSize: string | null;
  version: number;
  deliveredAt: string | null;
  notes: string | null;
  tags: TagRow[];
  createdAt: string;
  updatedAt: string;
}

// ─── Phase 4: AI receipt → project cost ───────────────────────────
export interface AiReceiptDraft {
  vendor: string | null;
  amount: number | null;
  date: string;
  /** One of PROJECT_COST_CATEGORIES — the AI's best guess. */
  suggestedCategory: string;
  description: string | null;
  currency: string;
  summary: string;
}

/** A project cost enriched with its project context (org-wide receipt inbox list). */
export interface CostWithProjectRow extends ProjectCostRow {
  projectName: string;
  referenceCode: string;
  serviceType: string;
}

// ─── Phase 5: Marketing & retention ───────────────────────────────
export const LEAD_STAGES = ["new", "quoted", "booked", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<string, string> = {
  new: "New",
  quoted: "Quoted",
  booked: "Booked",
  lost: "Lost",
};

/** Suggested sources for the source dropdown — `source` is free text otherwise. */
export const LEAD_SOURCES = [
  "referral",
  "google_search",
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "website",
  "repeat_client",
  "event",
  "other",
] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  google_search: "Google search",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  website: "Website",
  repeat_client: "Repeat client",
  event: "Event",
  other: "Other",
};

/**
 * Server-side sanitization for free-text fields captured from the public form.
 * Strips HTML tags and dangerous control characters (keeps tab/newline), trims,
 * and caps length. React escapes on render, but we neutralize input at the
 * boundary too so stored data can never carry markup.
 */
export function sanitizeText(input: string | null | undefined, maxLen = 2000): string | null {
  if (input == null) return null;
  let s = String(input);
  s = s.replace(/<[^>]*>/g, ""); // strip HTML tags
  s = Array.from(s)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("");
  s = s.trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s.length ? s : null;
}

// Public, unauthenticated lead-capture payload. `website` is a honeypot field
// that must stay empty — real users never see it; bots fill it.
export const publicLeadInput = z.object({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  company: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
  source: z.string().max(80).optional(),
  serviceType: z.string().max(60).optional(),
  website: z.string().max(500).optional(), // honeypot
});
export type PublicLeadInput = z.infer<typeof publicLeadInput>;

// Owner-side lead create/update.
export const leadInput = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  serviceType: z.string().max(60).optional().nullable(),
  stage: z.enum(LEAD_STAGES).optional().default("new"),
});
export type LeadInput = z.infer<typeof leadInput>;

export const leadStageUpdate = z.object({ stage: z.enum(LEAD_STAGES) });

export const reviewRequestInput = z.object({
  projectId: z.string().min(1),
  message: z.string().max(2000).optional().nullable(),
});
export type ReviewRequestInput = z.infer<typeof reviewRequestInput>;

export interface LeadRow {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string | null;
  serviceType: string | null;
  stage: string;
  convertedClientId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequestRow {
  id: string;
  projectId: string;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  message: string | null;
  createdAt: string;
}

/** A delivered + fully-paid project eligible for an owner-triggered review request. */
export interface ReviewEligibleRow {
  projectId: string;
  projectName: string;
  referenceCode: string;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  totalPaid: number;
  currency: string;
  reviewRequestCount: number;
  lastRequestedAt: string | null;
}

export interface SourceReportRow {
  source: string;
  leads: number;
  booked: number;
  converted: number;
  clients: number;
  conversionRate: number;
}

export interface ReactivationClientRow {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
  totalPaid: number;
  lastActivity: string | null;
  daysSinceActivity: number;
}

export const PROJECT_SERVICE_TYPES = ["commercial", "voiceover", "podcast", "drone"] as const;
export type ProjectServiceType = (typeof PROJECT_SERVICE_TYPES)[number];

export const PROJECT_STATUSES = [
  "lead",
  "quoted",
  "booked",
  "filming_recording",
  "editing",
  "review",
  "delivered",
  "closed",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const CLIENT_STATUSES = ["active", "inactive", "prospect"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

// ─── Zod input schemas ────────────────────────────────────────────
export const addressSchema = z.object({
  line1: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  postalCode: z.string().max(30).optional(),
  country: z.string().max(60).optional(),
});

export const clientInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(CLIENT_STATUSES).optional().default("active"),
  tagIds: z.array(z.string()).optional().default([]),
});

export const lineItemInput = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number(),
  taxRate: z.number().min(0).max(100).default(0),
  unit: z.string().max(20).optional().nullable(),
});

export const discountInput = z.object({
  description: z.string().max(255).optional().nullable(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().min(0),
});

export const depositInput = z.object({
  description: z.string().max(255).optional().nullable(),
  amount: z.number().min(0),
});

// ─── Phase 2: Recurring + Approvals ──────────────────────────────
export const RECURRING_FREQUENCIES = ["weekly", "monthly", "quarterly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const RECURRING_STATUSES = ["active", "paused", "cancelled"] as const;
export type RecurringStatus = (typeof RECURRING_STATUSES)[number];

export const MILESTONE_TYPES = ["deposit", "balance", "milestone"] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export const recurringItemInput = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().optional().default(0),
});

export const recurringInput = z.object({
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  name: z.string().min(1).max(255),
  status: z.enum(RECURRING_STATUSES).optional().default("active"),
  frequency: z.enum(RECURRING_FREQUENCIES).optional().default("monthly"),
  nextDate: z.string(),
  endDate: z.string().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  totalPrepaid: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(recurringItemInput).min(1),
});

export const estimateApprovalInput = z.object({
  signerName: z.string().min(1).max(255),
  signerEmail: z.string().email().max(255),
});

export type RecurringInput = z.infer<typeof recurringInput>;
export type EstimateApprovalInput = z.infer<typeof estimateApprovalInput>;

export const invoiceInput = z.object({
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  milestoneType: z.enum(MILESTONE_TYPES).optional().nullable(),
  number: z.string().min(1).max(50).optional(),
  status: z.enum(INVOICE_STATUSES).default("draft"),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string().length(3).default("USD"),
  items: z.array(lineItemInput).min(1, "At least one line item is required"),
  discounts: z.array(discountInput).default([]),
  deposits: z.array(depositInput).default([]),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});
export const invoiceUpdate = invoiceInput.partial();

export const estimateInput = z.object({
  clientId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  number: z.string().min(1).max(50).optional(),
  status: z.enum(ESTIMATE_STATUSES).default("draft"),
  issueDate: z.string(),
  expiryDate: z.string().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  items: z.array(lineItemInput).min(1, "At least one line item is required"),
  discounts: z.array(discountInput).default([]),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});
export const estimateUpdate = estimateInput.partial();

export const expenseInput = z.object({
  category: z.string().max(100).optional().nullable(),
  vendor: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  date: z.string(),
  taxDeductible: z.boolean().default(false),
  clientId: z.string().optional().nullable(),
});

export const orgUpdateInput = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  defaultCurrency: z.string().length(3).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
  defaultNotes: z.string().optional().nullable(),
  defaultTerms: z.string().optional().nullable(),
  taxSetAsidePercent: z.number().min(0).max(100).optional(),
});

export const tagInput = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6b7280"),
});

export const projectInput = z.object({
  clientId: z.string().optional().nullable(),
  name: z.string().min(1).max(255),
  serviceType: z.enum(PROJECT_SERVICE_TYPES),
  status: z.enum(PROJECT_STATUSES).optional().default("lead"),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const projectStatusUpdate = z.object({
  status: z.enum(PROJECT_STATUSES),
});

export type ClientInput = z.infer<typeof clientInput>;
export type InvoiceInput = z.infer<typeof invoiceInput>;
export type EstimateInput = z.infer<typeof estimateInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type OrgUpdateInput = z.infer<typeof orgUpdateInput>;
export type TagInput = z.infer<typeof tagInput>;
export type ProjectInput = z.infer<typeof projectInput>;

// ─── Response row shapes (what routes return) ─────────────────────
export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string | null;
  status: string;
  tags: TagRow[];
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  createdAt: string;
}

export interface ProjectRow {
  id: string;
  orgId: string;
  clientId: string | null;
  client: { id: string; name: string; company: string | null } | null;
  name: string;
  referenceCode: string;
  serviceType: ProjectServiceType;
  status: ProjectStatus;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  tags: TagRow[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  unit: string | null;
  sortOrder: number;
}
export interface DiscountRow {
  id: string;
  description: string | null;
  type: string;
  value: number;
  amount: number;
}
export interface DepositRow {
  id: string;
  description: string | null;
  amount: number;
}

export interface InvoiceRow {
  id: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  depositsTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  clientId: string | null;
  client?: { id: string; name: string; company: string | null; email: string | null } | null;
  projectId: string | null;
  project?: { id: string; name: string; referenceCode: string } | null;
  milestoneType: string | null;
  items: ItemRow[];
  discounts: DiscountRow[];
  deposits: DepositRow[];
  fromEstimateId: string | null;
  recurringScheduleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateApprovalRow {
  id: string;
  estimateId: string;
  signerName: string;
  signerEmail: string;
  createdAt: string;
}

export interface RecurringItemRow {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  sortOrder: number;
}

export interface RecurringScheduleRow {
  id: string;
  orgId: string;
  clientId: string | null;
  client: { id: string; name: string; company: string | null } | null;
  projectId: string | null;
  project: { id: string; name: string; referenceCode: string } | null;
  name: string;
  status: RecurringStatus;
  frequency: RecurringFrequency;
  nextDate: string;
  endDate: string | null;
  currency: string;
  totalPrepaid: number;
  unitsUsed: number;
  notes: string | null;
  items: RecurringItemRow[];
  totals: InvoiceTotals;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateRow {
  id: string;
  number: string;
  status: EstimateStatus;
  issueDate: string;
  expiryDate: string | null;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  clientId: string | null;
  client?: { id: string; name: string; company: string | null; email: string | null } | null;
  projectId: string | null;
  project?: { id: string; name: string; referenceCode: string } | null;
  items: ItemRow[];
  discounts: DiscountRow[];
  convertedInvoiceId: string | null;
  approval: EstimateApprovalRow | null;
  createdAt: string;
}

export interface ExpenseRow {
  id: string;
  category: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
  currency: string;
  date: string;
  taxDeductible: boolean;
  clientId: string | null;
  client?: { id: string; name: string } | null;
}

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  brandColor: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: number;
  defaultNotes: string | null;
  defaultTerms: string | null;
  taxSetAsidePercent: number;
  leadCaptureKey: string | null;
}

// ─── AI invoice import ────────────────────────────────────────────
export interface AiDraftItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface AiInvoiceDraft {
  /** Matched existing client id, or null if no confident match. */
  matchedClientId: string | null;
  /** Details the AI read for the client (for creating one if unmatched). */
  client: { name: string | null; email: string | null; company: string | null };
  currency: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  discountPercent: number | null;
  items: AiDraftItem[];
  /** One-line description of what the AI did / assumptions made. */
  summary: string;
  /** Live preview totals computed from the draft. */
  totals: InvoiceTotals;
}

export interface DashboardStats {
  revenue: number;
  outstanding: number;
  overdue: number;
  draftCount: number;
  paidCount: number;
  clientCount: number;
  expensesTotal: number;
  netProfit: number;
  taxSetAside: number;
  taxSetAsidePercent: number;
  monthly: { month: string; revenue: number; expenses: number }[];
  recentInvoices: InvoiceRow[];
  statusBreakdown: { status: string; count: number; amount: number }[];
  cashFlow: CashFlowForecast;
}
