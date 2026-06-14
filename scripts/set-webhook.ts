/**
 * Register the Telegram webhook (with secret token) and publish the command menu.
 *
 * Usage (values from your shell env or pasted inline):
 *   TELEGRAM_TOKEN=... \
 *   TELEGRAM_WEBHOOK_SECRET=... \
 *   WEBHOOK_URL=https://cinemind.<you>.workers.dev/webhook \
 *   pnpm setup:webhook
 */
import { PUBLIC_COMMANDS } from '../src/config.js';

const TOKEN = process.env.TELEGRAM_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const URL_ = process.env.WEBHOOK_URL;

if (!TOKEN || !SECRET || !URL_) {
  console.error('Set TELEGRAM_TOKEN, TELEGRAM_WEBHOOK_SECRET and WEBHOOK_URL.');
  process.exit(1);
}

const api = (method: string) => `https://api.telegram.org/bot${TOKEN}/${method}`;

async function post(method: string, body: unknown): Promise<void> {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(method, json);
}

async function main(): Promise<void> {
  await post('setWebhook', {
    url: URL_,
    secret_token: SECRET,
    allowed_updates: ['message', 'callback_query', 'chat_member'],
    drop_pending_updates: true,
  });
  await post('setMyCommands', { commands: PUBLIC_COMMANDS });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
