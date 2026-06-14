import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { Env } from '../env.js';
import * as schema from './schema.js';

export type DB = DrizzleD1Database<typeof schema>;

export function getDb(env: Env): DB {
  return drizzle(env.DB, { schema });
}
