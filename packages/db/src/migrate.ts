/** Run pending Drizzle migrations against DATABASE_URL. */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required to migrate');

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './migrations' });
console.log('Migrations complete.');
await sql.end();
