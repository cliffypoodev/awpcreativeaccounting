/** InvoiceForge — seed script. Creates a demo tenant with realistic data. */
import { randomBytes, scryptSync } from 'node:crypto';
import { db } from './index.js';
import { organizations, users, clients, invoices, invoiceItems } from './schema.js';
import { calculateInvoice } from '@invoiceforge/shared/calc';

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  console.log('Seeding demo tenant...');

  const [org] = await db
    .insert(organizations)
    .values({
      name: 'AWP Creative Accounting',
      slug: 'awp-creative',
      email: 'hello@awpcreative.test',
      brandColor: '#E8A33D',
      defaultCurrency: 'USD',
      defaultPaymentTerms: 30,
      plan: 'pro',
      aiTokensLimit: 250_000,
    })
    .returning();

  if (!org) throw new Error('org insert failed');

  await db.insert(users).values({
    orgId: org.id,
    email: 'owner@awpcreative.test',
    name: 'Demo Owner',
    role: 'owner',
    emailVerified: true,
    passwordHash: hashPassword('demo-password-123'),
  });

  const insertedClients = await db
    .insert(clients)
    .values([
      { orgId: org.id, name: 'Northwind Studios', email: 'ap@northwind.test', company: 'Northwind LLC' },
      { orgId: org.id, name: 'Acme Robotics', email: 'billing@acme.test', company: 'Acme Inc' },
    ])
    .returning();

  const client = insertedClients[0]!;

  const items = [
    { quantity: 12, unitPrice: 150, taxRate: 8.5, description: 'Brand identity design (hours)' },
    { quantity: 1, unitPrice: 2500, taxRate: 8.5, description: 'Website build — fixed fee' },
  ];
  const totals = calculateInvoice(items, [{ type: 'percentage', value: 10 }], []);

  const [inv] = await db
    .insert(invoices)
    .values({
      orgId: org.id,
      clientId: client.id,
      number: 'INV-0001',
      status: 'sent',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      currency: 'USD',
      subtotal: String(totals.subtotal),
      taxAmount: String(totals.taxAmount),
      discountAmount: String(totals.discountAmount),
      total: String(totals.total),
      amountDue: String(totals.amountDue),
      viewToken: randomBytes(24).toString('hex'),
      paymentLinkToken: randomBytes(24).toString('hex'),
    })
    .returning();

  if (inv) {
    await db.insert(invoiceItems).values(
      items.map((it, i) => ({
        invoiceId: inv.id,
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        amount: String(it.quantity * it.unitPrice),
        taxRate: String(it.taxRate),
        sortOrder: i,
      })),
    );
  }

  console.log(`Seeded org=${org.slug} invoice total=$${totals.total}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
