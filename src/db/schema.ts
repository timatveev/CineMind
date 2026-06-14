import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

/** Telegram users and their taste profiles. Ported from the Google Sheet "Users". */
export const users = sqliteTable('users', {
  /** Telegram user id. */
  id: integer('id').primaryKey(),
  state: text('state').notNull().default('WAITING_PROFILE'),
  profile: text('profile'),
  location: text('location'),
  /** Manually granted VIP (bypasses limits). */
  isSubManual: integer('is_sub_manual', { mode: 'boolean' }).notNull().default(false),
  /** YYYY-MM-DD of last counted activity, for daily-limit reset. */
  lastActivityDate: text('last_activity_date'),
  dailyCount: integer('daily_count').notNull().default(0),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isDigest: integer('is_digest', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

/** Per-user conversation history fed back to Gemini. Replaces the KV-only context. */
export const history = sqliteTable(
  'history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(),
    /** 'user' | 'model' (Gemini roles). */
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    byUser: index('history_user_idx').on(t.userId, t.id),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type HistoryRow = typeof history.$inferSelect;
