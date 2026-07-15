/** InvoiceForge — DB client (postgres.js + Drizzle). */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://invoiceforge:invoiceforge@localhost:5432/invoiceforge';

// Reuse a single pool in dev to survive HMR.
const globalForDb = globalThis as unknown as { __ifClient?: ReturnType<typeof postgres> };
const client = globalForDb.__ifClient ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== 'production') globalForDb.__ifClient = client;

export const db = drizzle(client, { schema });
export { and, desc, eq, ilike, sql } from 'drizzle-orm';
export { schema };
export * from './schema';
