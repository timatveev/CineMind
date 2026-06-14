import type { Bot } from 'grammy';
import type { MyContext } from '../context.js';

/** Group-chat behaviour: greet newcomers, and redirect commands to DM. */
export function registerGroupHandlers(bot: Bot<MyContext>): void {
  bot.on('message:new_chat_members', async (ctx) => {
    const link = `https://t.me/${ctx.env.BOT_USERNAME.replace('@', '')}`;
    for (const m of ctx.message.new_chat_members) {
      if (m.is_bot) continue;
      await ctx.reply(
        `👋 Привет, ${m.first_name}! <a href="${link}">Напиши мне в личку</a> за рекомендацией.`,
        { parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
      );
    }
  });

  // In non-private chats, only react to slash commands with a hint.
  bot
    .filter((ctx) => ctx.chat?.type !== 'private')
    .on('message:text', async (ctx) => {
      if (ctx.message.text.startsWith('/')) {
        await ctx.reply('⚠️ Команды работают только в личке бота.');
      }
    });
}
