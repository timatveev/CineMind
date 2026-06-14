import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { LIMITS, USER_STATE, type UserState } from '../config.js';
import type { DB } from './client.js';
import { history, users, type User } from './schema.js';

/** YYYY-MM-DD in UTC, used for the daily-limit reset boundary. */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getUser(db: DB, userId: number): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

/** /start: create a fresh user or reset an existing one back to onboarding. */
export async function startUser(db: DB, userId: number): Promise<void> {
  await db
    .insert(users)
    .values({ id: userId, state: USER_STATE.WAITING_PROFILE })
    .onConflictDoUpdate({
      target: users.id,
      set: { state: USER_STATE.WAITING_PROFILE, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
}

export async function setProfile(db: DB, userId: number, profile: string): Promise<void> {
  await db
    .update(users)
    .set({ profile, state: USER_STATE.WAITING_LOCATION, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(users.id, userId));
}

export async function setLocation(db: DB, userId: number, location: string): Promise<void> {
  await db
    .update(users)
    .set({ location, state: USER_STATE.READY, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(users.id, userId));
}

export async function setState(db: DB, userId: number, state: UserState): Promise<void> {
  await db
    .update(users)
    .set({ state, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(users.id, userId));
}

export async function setDigest(db: DB, userId: number, isDigest: boolean): Promise<void> {
  await db
    .update(users)
    .set({ isDigest, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(users.id, userId));
}

export async function deleteUser(db: DB, userId: number): Promise<void> {
  await db.delete(history).where(eq(history.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Atomically consume one daily request. Returns true if allowed.
 * Replaces the original Sheets read-modify-write race.
 */
export async function consumeDailyLimit(
  db: DB,
  user: User,
  limit: number,
): Promise<boolean> {
  const today = todayStr();

  // New day → reset counter to 1 and allow.
  if (user.lastActivityDate !== today) {
    await db
      .update(users)
      .set({ dailyCount: 1, lastActivityDate: today, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));
    return true;
  }

  // Same day → increment only if still under the limit (single atomic statement).
  const rows = await db
    .update(users)
    .set({ dailyCount: sql`${users.dailyCount} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(users.id, user.id), lt(users.dailyCount, limit)))
    .returning({ dailyCount: users.dailyCount });

  return rows.length > 0;
}

export async function getAdmins(db: DB): Promise<number[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true));
  return rows.map((r) => r.id);
}

export async function getDigestUsers(db: DB): Promise<User[]> {
  return db.query.users.findMany({
    where: and(eq(users.isDigest, true), sql`${users.profile} IS NOT NULL`),
  });
}

// ── Conversation history ──

export async function appendHistory(
  db: DB,
  userId: number,
  userText: string,
  modelText: string,
): Promise<void> {
  await db.insert(history).values([
    { userId, role: 'user', content: userText },
    { userId, role: 'model', content: modelText },
  ]);
}

/** Returns the last N turns in chronological order, shaped for Gemini `contents`. */
export async function getHistory(
  db: DB,
  userId: number,
): Promise<{ role: string; parts: { text: string }[] }[]> {
  const rows = await db
    .select({ role: history.role, content: history.content })
    .from(history)
    .where(eq(history.userId, userId))
    .orderBy(desc(history.id))
    .limit(LIMITS.HISTORY_TURNS);

  return rows
    .reverse()
    .map((r) => ({ role: r.role, parts: [{ text: r.content }] }));
}
