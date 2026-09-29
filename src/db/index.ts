import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Node.js runtime mein WebSocket global available nahi hota — 'ws' se provide karna zaroori hai.
// NOTE: agar koi route explicitly `export const runtime = "edge"` set karta hai, ye driver
// wahan kaam nahi karega — us route ko Node.js runtime par rakhna hoga, ya alag HTTP-based
// read-only client use karna hoga jo transactions na chahta ho.
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];