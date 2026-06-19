/**
 * InvoiceForge — Drizzle schema (PostgreSQL 16 + pgvector).
 * Implements blueprint §4 in full, including the estimate tables that the
 * blueprint described as "mirror invoice structure".
 *
 * Multi-tenancy: every tenant-scoped table carries org_id. PostgreSQL RLS
 * policies are added in the SQL migration (see migrations/0001_rls.sql).
 */
import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  decimal,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Organizations ────────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  logoUrl: text('logo_url'),
  brandColor: varchar('brand_color', { length: 7 }).default('#000000'),
  address: jsonb('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 500 }),
  taxId: varchar('tax_id', { length: 100 }),
  defaultCurrency: varchar('default_currency', { length: 3 }).default('USD'),
  defaultTaxRate: decimal('default_tax_rate', { precision: 5, scale: 2 }),
  defaultPaymentTerms: integer('default_payment_terms').default(30),
  defaultNotes: text('default_notes'),
  defaultTerms: text('default_terms'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).default('free'),
  aiTokensUsed: integer('ai_tokens_used').default(0),
  aiTokensLimit: integer('ai_tokens_limit').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }),
    passwordHash: text('password_hash'),
    avatarUrl: text('avatar_url'),
    role: varchar('role', { length: 20 }).default('member'),
    emailVerified: boolean('email_verified').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ orgIdx: index('users_org_idx').on(t.orgId) }),
);

// ─── Clients ──────────────────────────────────────────────────────
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    company: varchar('company', { length: 255 }),
    address: jsonb('address'),
    notes: text('notes'),
    totalInvoiced: decimal('total_invoiced', { precision: 12, scale: 2 }).default('0'),
    totalPaid: decimal('total_paid', { precision: 12, scale: 2 }).default('0'),
    totalOutstanding: decimal('total_outstanding', { precision: 12, scale: 2 }).default('0'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ orgIdx: index('clients_org_idx').on(t.orgId) }),
);

// ─── Invoices ─────────────────────────────────────────────────────
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    number: varchar('number', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).default('0'),
    amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).default('0'),
    amountDue: decimal('amount_due', { precision: 12, scale: 2 }).default('0'),
    notes: text('notes'),
    terms: text('terms'),
    templateId: uuid('template_id'),
    fromEstimateId: uuid('from_estimate_id'),
    paymentLinkToken: varchar('payment_link_token', { length: 64 }).unique(),
    viewToken: varchar('view_token', { length: 64 }).unique(),
    isRecurring: boolean('is_recurring').default(false),
    recurringSchedule: jsonb('recurring_schedule'),
    sentAt: timestamp('sent_at'),
    viewedAt: timestamp('viewed_at'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('invoices_org_idx').on(t.orgId),
    clientIdx: index('invoices_client_idx').on(t.clientId),
    statusIdx: index('invoices_status_idx').on(t.status),
    orgNumberIdx: uniqueIndex('invoices_org_number_idx').on(t.orgId, t.number),
  }),
);

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 4 }).default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  sortOrder: integer('sort_order').default(0),
});

export const invoiceDiscounts = pgTable('invoice_discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }),
  type: varchar('type', { length: 10 }).notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

export const invoiceDeposits = pgTable('invoice_deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at'),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
});

export const invoiceEvents = pgTable(
  'invoice_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 30 }).notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (t) => ({ invoiceIdx: index('invoice_events_invoice_idx').on(t.invoiceId) }),
);

export const invoiceAttachments = pgTable('invoice_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
});

// ─── Estimates (mirror invoices + expiry / approval / conversion) ──
export const estimates = pgTable(
  'estimates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    number: varchar('number', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft'),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date'),
    currency: varchar('currency', { length: 3 }).default('USD'),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).default('0'),
    notes: text('notes'),
    terms: text('terms'),
    templateId: uuid('template_id'),
    approvalToken: varchar('approval_token', { length: 64 }).unique(),
    viewToken: varchar('view_token', { length: 64 }).unique(),
    convertedInvoiceId: uuid('converted_invoice_id'),
    sentAt: timestamp('sent_at'),
    viewedAt: timestamp('viewed_at'),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('estimates_org_idx').on(t.orgId),
    orgNumberIdx: uniqueIndex('estimates_org_number_idx').on(t.orgId, t.number),
  }),
);

export const estimateItems = pgTable('estimate_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').references(() => estimates.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 4 }).default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  sortOrder: integer('sort_order').default(0),
});

export const estimateDiscounts = pgTable('estimate_discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').references(() => estimates.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }),
  type: varchar('type', { length: 10 }).notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

export const estimateEvents = pgTable('estimate_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').references(() => estimates.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 30 }).notNull(),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
});

// ─── Expenses ─────────────────────────────────────────────────────
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 100 }),
    vendor: varchar('vendor', { length: 255 }),
    description: text('description'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    date: date('date').notNull(),
    receiptUrl: text('receipt_url'),
    receiptData: jsonb('receipt_data'),
    taxDeductible: boolean('tax_deductible').default(false),
    clientId: uuid('client_id').references(() => clients.id),
  },
  (t) => ({ orgIdx: index('expenses_org_idx').on(t.orgId) }),
);

// ─── Templates / Automations / AI ─────────────────────────────────
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  isSystem: boolean('is_system').default(false),
  config: jsonb('config').notNull(),
});

export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  trigger: varchar('trigger', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  config: jsonb('config'),
  isActive: boolean('is_active').default(true),
});

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  messages: jsonb('messages').notNull(),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Audit log (blueprint security checklist) ─────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ orgIdx: index('audit_logs_org_idx').on(t.orgId) }),
);

// ─── Relations ────────────────────────────────────────────────────
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  invoices: many(invoices),
  estimates: many(estimates),
  expenses: many(expenses),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  discounts: many(invoiceDiscounts),
  deposits: many(invoiceDeposits),
  events: many(invoiceEvents),
  attachments: many(invoiceAttachments),
}));

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  organization: one(organizations, { fields: [estimates.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [estimates.clientId], references: [clients.id] }),
  items: many(estimateItems),
  discounts: many(estimateDiscounts),
  events: many(estimateEvents),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, { fields: [clients.orgId], references: [organizations.id] }),
  invoices: many(invoices),
  estimates: many(estimates),
}));

// Inferred row types
export type Organization = typeof organizations.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Estimate = typeof estimates.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type User = typeof users.$inferSelect;
