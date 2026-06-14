import { Bot } from 'grammy';
import type { Env } from './env.js';
import type { MyContext } from './context.js';
import { getDb } from './db/client.js';
import { getUser } from './db/repository.js';
import { Logger } from './lib/logger.js';
import { COMMANDS, LIMITS, USER_STATE } from './config.js';
import { registerGroupHandlers } from './handlers/group.js';
import { handleLocationInput, handleProfileInput, handleStart } from './handlers/onboarding.js';
import { handleRecommendation } from './handlers/recommend.js';
import {
  handleDeleteMe,
  handleDonate,
  handlePrivacy,
  handleProfile,
  handleSubscribe,
  handleUnsubscribe,
} from './handlers/commands.js';
import { handlePost } from './handlers/admin.js';

export function createBot(env: Env): Bot<MyContext> {
  const bot = new Bot<MyContext>(env.TELEGRAM_TOKEN);

  // ── Inject per-request dependencies ──
  bot.use(async (ctx, next) => {
    ctx.env = env;
    ctx.db = getDb(env);
    ctx.log = new Logger(env);
    if (ctx.from && !ctx.from.is_bot) {
      ctx.appUser = await getUser(ctx.db, ctx.from.id);
    }
    await next();
  });

  // ── Deduplicate retried updates (KV-backed) ──
  bot.on('message', async (ctx, next) => {
    const key = `dedup_${ctx.from?.id}_${ctx.message.message_id}`;
    if (await ctx.env.CACHE.get(key)) {
      ctx.log.warn('Bot', ctx.from?.id ?? null, 'Duplicate update ignored', { key });
      return;
    }
    await ctx.env.CACHE.put(key, '1', { expirationTtl: LIMITS.DEDUP_TTL });
    await next();
  });

  // ── Group chats ──
  registerGroupHandlers(bot);

  // ── Private chats only ──
  const pm = bot.chatType('private');

  pm.command(COMMANDS.START, handleStart);
  pm.command(COMMANDS.PROFILE, handleProfile);
  pm.command(COMMANDS.SUBSCRIBE, handleSubscribe);
  pm.command(COMMANDS.UNSUBSCRIBE, handleUnsubscribe);
  pm.command(COMMANDS.DONATE, handleDonate);
  pm.command(COMMANDS.DELETE_ME, handleDeleteMe);
  pm.command(COMMANDS.PRIVACY, handlePrivacy);
  pm.command(COMMANDS.POST, handlePost);

  pm.command(COMMANDS.CINEMA, (ctx) => handleRecommendation(ctx, 'cinema'));
  pm.command(COMMANDS.RELEASES, (ctx) => handleRecommendation(ctx, 'releases'));
  pm.command(COMMANDS.SOON, (ctx) => handleRecommendation(ctx, 'soon'));

  // Inline menu buttons mirror the quick commands.
  pm.callbackQuery('act:cinema', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRecommendation(ctx, 'cinema');
  });
  pm.callbackQuery('act:releases', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRecommendation(ctx, 'releases');
  });
  pm.callbackQuery('act:soon', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRecommendation(ctx, 'soon');
  });
  pm.callbackQuery('act:profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleProfile(ctx);
  });

  // Free text → onboarding state machine or a free-form query.
  pm.on('message:text', async (ctx) => {
    const user = ctx.appUser;
    if (!user) {
      await ctx.reply('Нажми /start');
      return;
    }
    if (user.state === USER_STATE.WAITING_PROFILE) {
      await handleProfileInput(ctx, ctx.message.text);
      return;
    }
    if (user.state === USER_STATE.WAITING_LOCATION) {
      await handleLocationInput(ctx, ctx.message.text);
      return;
    }
    await handleRecommendation(ctx, ctx.message.text);
  });

  bot.catch((err) => {
    err.ctx.log?.error('Bot', err.ctx.from?.id ?? null, 'Unhandled error', String(err.error));
  });

  return bot;
}
