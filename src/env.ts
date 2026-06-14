/**
 * Runtime bindings & secrets available to the Worker.
 *
 * Bindings (DB, CACHE) are configured in wrangler.toml.
 * Secrets are set via `wrangler secret put` (production) or .dev.vars (local).
 */
export interface Env {
  // ── Cloudflare bindings ──
  DB: D1Database;
  CACHE: KVNamespace;

  // ── Telegram ──
  TELEGRAM_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  BOT_USERNAME: string;

  // ── Gemini ──
  GEMINI_API_KEY: string;
  MODEL_FAST: string;
  MODEL_SMART: string;

  // ── Business config ──
  DAILY_LIMIT: string;
  VIP_CHAT_ID: string;
  PATREON_URL: string;
  BOOSTY_URL: string;

  // ── Optional ──
  ADMIN_IDS?: string;
}
