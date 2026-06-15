import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { USER_STATE } from '../src/config.js';
import { getDb } from '../src/db/client.js';
import {
  appendHistory,
  consumeDailyLimit,
  getHistory,
  getUser,
  setLocation,
  setProfile,
  startUser,
} from '../src/db/repository.js';
import { history, users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// High, synthetic id space so we never collide with seeded users.
const UID = 900_000_001;

const db = getDb(env);

async function wipe(): Promise<void> {
  await db.delete(history).where(eq(history.userId, UID));
  await db.delete(users).where(eq(users.id, UID));
}

beforeEach(wipe);
afterEach(wipe);

describe('user lifecycle (real D1)', () => {
  it('creates a user in onboarding state on /start', async () => {
    await startUser(db, UID);

    const user = await getUser(db, UID);
    expect(user).toBeDefined();
    expect(user!.state).toBe(USER_STATE.WAITING_PROFILE);
    expect(user!.dailyCount).toBe(0);
  });

  it('walks profile -> location -> ready', async () => {
    await startUser(db, UID);
    await setProfile(db, UID, 'люблю sci-fi и нуар');
    expect((await getUser(db, UID))!.state).toBe(USER_STATE.WAITING_LOCATION);

    await setLocation(db, UID, 'Санкт-Петербург');
    const ready = await getUser(db, UID);
    expect(ready!.state).toBe(USER_STATE.READY);
    expect(ready!.profile).toBe('люблю sci-fi и нуар');
    expect(ready!.location).toBe('Санкт-Петербург');
  });
});

describe('daily limit (atomic consume)', () => {
  it('allows exactly `limit` requests per day, then blocks', async () => {
    await startUser(db, UID);
    const limit = 3;

    const results: boolean[] = [];
    for (let i = 0; i < limit + 2; i++) {
      const user = (await getUser(db, UID))!;
      results.push(await consumeDailyLimit(db, user, limit));
    }

    expect(results).toEqual([true, true, true, false, false]);
    expect((await getUser(db, UID))!.dailyCount).toBe(limit);
  });
});

describe('conversation history', () => {
  it('round-trips turns in chronological order shaped for Gemini', async () => {
    await startUser(db, UID);
    await appendHistory(db, UID, 'посоветуй комедию', 'Смотри «Один дома»');
    await appendHistory(db, UID, 'а ещё?', 'Тогда «Маска»');

    const turns = await getHistory(db, UID);
    expect(turns).toEqual([
      { role: 'user', parts: [{ text: 'посоветуй комедию' }] },
      { role: 'model', parts: [{ text: 'Смотри «Один дома»' }] },
      { role: 'user', parts: [{ text: 'а ещё?' }] },
      { role: 'model', parts: [{ text: 'Тогда «Маска»' }] },
    ]);
  });
});

describe('KV namespace (real CACHE binding)', () => {
  it('stores and reads back a value with TTL', async () => {
    await env.CACHE.put(`dedup:${UID}`, '1', { expirationTtl: 300 });
    expect(await env.CACHE.get(`dedup:${UID}`)).toBe('1');

    await env.CACHE.delete(`dedup:${UID}`);
    expect(await env.CACHE.get(`dedup:${UID}`)).toBeNull();
  });
});
