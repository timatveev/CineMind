import type { MyContext } from '../context.js';
import { buildCommandPrompt } from '../prompts.js';
import { appendHistory, consumeDailyLimit, getHistory } from '../db/repository.js';
import { generateRecommendation } from '../services/gemini.js';
import { sendFormatted } from '../services/telegram.js';
import { dailyLimit, isVip } from '../lib/vip.js';

function describe(command: string, location: string): { loading: string; prompt: string } {
  switch (command) {
    case 'cinema':
      return { loading: `🍿 <b>Ищу сеансы в г. ${location}...</b>`, prompt: buildCommandPrompt('cinema', location) };
    case 'releases':
      return { loading: '🏠 <b>Ищу цифровые релизы...</b>', prompt: buildCommandPrompt('releases', location) };
    case 'soon':
      return { loading: '🔮 <b>Смотрю график премьер...</b>', prompt: buildCommandPrompt('soon', location) };
    default:
      return { loading: '🤔 <b>Думаю...</b>', prompt: command };
  }
}

export async function sendLimitMessage(ctx: MyContext): Promise<void> {
  await ctx.reply(
    `⛔ <b>Лимит исчерпан!</b>\n\nОформи подписку для безлимита:\n` +
      `🌍 <a href="${ctx.env.PATREON_URL}">Patreon</a> | 🇷🇺 <a href="${ctx.env.BOOSTY_URL}">Boosty</a>`,
    { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
  );
}

/**
 * Core recommendation flow used by quick commands, inline buttons and free text.
 * `command` is one of cinema|releases|soon, or raw user text.
 */
export async function handleRecommendation(ctx: MyContext, command: string): Promise<void> {
  const user = ctx.appUser;
  if (!user || !user.profile || !user.location) {
    await ctx.reply('Сначала заполни профиль (/start)');
    return;
  }

  if (!(await isVip(ctx))) {
    const allowed = await consumeDailyLimit(ctx.db, user, dailyLimit(ctx));
    if (!allowed) {
      await sendLimitMessage(ctx);
      return;
    }
  }

  const { loading, prompt } = describe(command, user.location);
  const chatId = ctx.chat!.id;

  await ctx.api.sendChatAction(chatId, 'typing').catch(() => {});
  const loadMsg = await ctx.reply(loading, { parse_mode: 'HTML' });

  try {
    const history = await getHistory(ctx.db, user.id);
    const answer = await generateRecommendation(ctx.env, {
      profile: user.profile,
      location: user.location,
      history,
      prompt,
    });
    await sendFormatted(ctx.api, chatId, answer);
    await appendHistory(ctx.db, user.id, prompt, answer);
  } catch (e) {
    ctx.log.error('Recommend', user.id, 'AI failure', String(e));
    await ctx.reply('⚠️ Мозг перегрелся. Попробуй позже.');
  } finally {
    await ctx.api.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
  }
}
