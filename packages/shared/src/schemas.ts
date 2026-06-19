/**
 * InvoiceForge — Zod validation schemas.
 * Used server-side by tRPC routers (blueprint security: Zod on all inputs)
 * and client-side by React Hook Form resolvers.
 */
import { z } from 'zod';
import {
  INVOICE_STATUSES,
  ESTIMATE_STATUSES,
  ROLES,
  PLAN_IDS,
  PDF_TEMPLATES,
} from './constants.js';

export const addressSchema = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  postalCode: z.string().max(30).optional(),
  country: z.string().max(2).optional(),
});

export const currencyCode = z.string().length(3).toUpperCase();

// ─── Organization ─────────────────────────────────────────────────
export const organizationInput = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and hyphens only'),
  logoUrl: z.string().url().optional().nullable(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#000000'),
  address: addressSchema.optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  website: z.string().url().max(500).optional(),
  taxId: z.string().max(100).optional(),
  defaultCurrency: currencyCode.default('USD'),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultPaymentTerms: z.number().int().min(0).max(365).default(30),
  defaultNotes: z.string().optional(),
  defaultTerms: z.string().optional(),
  plan: z.enum(PLAN_IDS as [string, ...string[]]).default('free'),
});

// ─── Client ───────────────────────────────────────────────────────
export const clientInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  address: addressSchema.optional(),
  notes: z.string().optional().nullable(),
});

// ─── Line items / discounts / deposits ────────────────────────────
export const lineItemInput = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number(),
  taxRate: z.number().min(0).max(100).default(0),
  unit: z.string().max(20).optional(),
});

export const discountInput = z.object({
  description: z.string().max(255).optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
});

export const depositInput = z.object({
  description: z.string().max(255).optional(),
  amount: z.number().min(0),
});

// ─── Invoice ──────────────────────────────────────────────────────
export const invoiceInput = z.object({
  clientId: z.string().uuid().optional().nullable(),
  number: z.string().min(1).max(50),
  status: z.enum(INVOICE_STATUSES).default('draft'),
  issueDate: z.string(), // ISO date
  dueDate: z.string(),
  currency: currencyCode.default('USD'),
  items: z.array(lineItemInput).min(1, 'At least one line item is required'),
  discounts: z.array(discountInput).default([]),
  deposits: z.array(depositInput).default([]),
  notes: z.string().optional(),
  terms: z.string().optional(),
  templateId: z.string().uuid().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurringSchedule: z
    .object({
      interval: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

export const invoiceUpdate = invoiceInput.partial().extend({ id: z.string().uuid() });

// ─── Estimate (mirrors invoice + expiry/approval) ─────────────────
export const estimateInput = invoiceInput
  .omit({ status: true, isRecurring: true, recurringSchedule: true })
  .extend({
    status: z.enum(ESTIMATE_STATUSES).default('draft'),
    expiryDate: z.string().optional(),
  });

// ─── Expense ──────────────────────────────────────────────────────
export const expenseInput = z.object({
  category: z.string().max(100).optional(),
  vendor: z.string().max(255).optional(),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: currencyCode.default('USD'),
  date: z.string(),
  receiptUrl: z.string().url().optional().nullable(),
  taxDeductible: z.boolean().default(false),
  clientId: z.string().uuid().optional().nullable(),
});

// ─── Auth ─────────────────────────────────────────────────────────
export const signupInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(1).max(255),
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const memberInviteInput = z.object({
  email: z.string().email(),
  role: z.enum(ROLES).default('member'),
});

// ─── PDF render ───────────────────────────────────────────────────
export const pdfRenderInput = z.object({
  invoiceId: z.string().uuid(),
  template: z.enum(PDF_TEMPLATES).default('classic'),
});

// ─── AI chat ──────────────────────────────────────────────────────
export const aiChatInput = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

export type OrganizationInput = z.infer<typeof organizationInput>;
export type ClientInput = z.infer<typeof clientInput>;
export type InvoiceInput = z.infer<typeof invoiceInput>;
export type EstimateInput = z.infer<typeof estimateInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type SignupInput = z.infer<typeof signupInput>;
export type LoginInput = z.infer<typeof loginInput>;
