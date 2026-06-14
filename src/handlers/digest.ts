import { Api } from 'grammy';
import type { Env } from '../env.js';
import { getDb } from '../db/client.js';
import { Logger } from '../lib/logger.js';
import { appendHistory, getDigestUsers, getHistory } from '../db/repository.js';
import { generateRecommendation } from '../services/gemini.js';
import { sendFormatted } from '../services/telegram.js';
import { buildCommandPrompt } from '../prompts.js';

/** Monthly digest: send each subscribed user a fresh "new releases" pick. */
export async function runDigest(env: Env): Promise<void> {
  const db = getDb(env);
  const api = new Api(env.TELEGRAM_TOKEN);
  const log = new Logger(env);

  const users = await getDigestUsers(db);
  log.info('Digest', null, 'Starting digest', { count: users.length });

  for (const u of users) {
    if (!u.profile || !u.location) continue;
    try {
      await api.sendMessage(u.id, '📅 <b>Твой дайджест готов!</b>', { parse_mode: 'HTML' });
      const history = await getHistory(db, u.id);
      const prompt = buildCommandPrompt('releases', u.location);
      const answer = await generateRecommendation(env, {
        profile: u.profile,
        location: u.location,
        history,
        prompt,
      });
      await sendFormatted(api, u.id, answer);
      await appendHistory(db, u.id, prompt, answer);
    } catch (e) {
      log.error('Digest', u.id, 'Digest error', String(e));
    }
  }
}
