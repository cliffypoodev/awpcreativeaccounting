import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://invoiceforge:invoiceforge@localhost:5432/invoiceforge',
  },
  verbose: true,
  strict: true,
});
