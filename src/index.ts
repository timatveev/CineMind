import type { Update } from 'grammy/types';
import type { Env } from './env.js';
import { createBot } from './bot.js';
import { runDigest } from './handlers/digest.js';

export default {
  /** HTTP entry point: Telegram webhook + health check. */
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/') {
      return new Response('CineMind bot is running 🎬');
    }

    if (req.method === 'POST' && url.pathname === '/webhook') {
      // Verify the request really came from Telegram.
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      const update = (await req.json()) as Update;
      const bot = createBot(env);

      // Ack immediately and process in the background so Telegram never
      // retries while Gemini is thinking (the old dedup pain point).
      ctx.waitUntil(
        (async () => {
          try {
            await bot.init();
            await bot.handleUpdate(update);
          } catch (e) {
            console.error('handleUpdate failed', String(e));
          }
        })(),
      );

      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  },

  /** Cron entry point: monthly digest (see [triggers] in wrangler.toml). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDigest(env));
  },
} satisfies ExportedHandler<Env>;
