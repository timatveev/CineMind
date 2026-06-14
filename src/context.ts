import type { Context } from 'grammy';
import type { Env } from './env.js';
import type { DB } from './db/client.js';
import type { Logger } from './lib/logger.js';
import type { User } from './db/schema.js';

/** Extra fields injected onto every grammY context. */
export interface AppFlavor {
  env: Env;
  db: DB;
  log: Logger;
  /** Current user record from D1 (undefined for brand-new users). */
  appUser?: User;
}

export type MyContext = Context & AppFlavor;
