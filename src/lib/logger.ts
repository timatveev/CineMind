import type { Env } from '../env.js';
import { getDb } from '../db/client.js';
import { getAdmins } from '../db/repository.js';

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/** Mask tokens/keys before anything is logged. Ported from legacy LoggerService. */
function maskSecrets(str: string): string {
  return str
    .replace(/key=[^&"]+/g, 'key=***')
    .replace(/token=[^&"]+/g, 'token=***')
    .replace(/\/bot[^/]+\//g, '/bot***/');
}

function serialize(payload: unknown): string {
  if (payload === undefined || payload === null) return '';
  if (typeof payload === 'string') return maskSecrets(payload);
  try {
    return maskSecrets(JSON.stringify(payload));
  } catch {
    return '[unserializable]';
  }
}

/**
 * Structured logger. Writes to console (visible via `wrangler tail` / Logpush)
 * and pushes WARN/ERROR alerts to admins in Telegram.
 */
export class Logger {
  constructor(private env: Env) {}

  private line(level: Level, ctx: string, userId: number | string | null, msg: string, payload?: unknown) {
    const entry = {
      level,
      ctx,
      user: userId ?? 'system',
      msg,
      payload: serialize(payload) || undefined,
    };
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }

  info(ctx: string, userId: number | string | null, msg: string, payload?: unknown) {
    this.line('INFO', ctx, userId, msg, payload);
  }
  debug(ctx: string, userId: number | string | null, msg: string, payload?: unknown) {
    this.line('DEBUG', ctx, userId, msg, payload);
  }
  warn(ctx: string, userId: number | string | null, msg: string, payload?: unknown) {
    this.line('WARN', ctx, userId, msg, payload);
    void this.alert('WARN', ctx, userId, msg);
  }
  error(ctx: string, userId: number | string | null, msg: string, payload?: unknown) {
    this.line('ERROR', ctx, userId, msg, payload);
    void this.alert('ERROR', ctx, userId, msg);
  }

  /** Notify admins via Telegram. Best-effort; never throws. */
  private async alert(level: Level, ctx: string, userId: number | string | null, msg: string) {
    try {
      const admins = await getAdmins(getDb(this.env));
      if (admins.length === 0) return;

      const icon = level === 'ERROR' ? '🚨' : '⚠️';
      const text =
        `${icon} <b>Log Alert: ${level}</b>\n` +
        `📂 <b>Module:</b> ${ctx}\n` +
        `👤 <b>User:</b> ${userId ?? 'N/A'}\n` +
        `📄 <b>Msg:</b> <pre>${maskSecrets(msg)}</pre>`;

      await Promise.all(
        admins.map((id) =>
          fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML' }),
          }),
        ),
      );
    } catch (e) {
      console.error('alert failed', String(e));
    }
  }
}
