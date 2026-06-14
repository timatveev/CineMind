import type { MyContext } from '../context.js';

/** /post <text> — broadcast a message to the VIP channel. Admins only. */
export async function handlePost(ctx: MyContext): Promise<void> {
  const user = ctx.appUser;
  if (!user || !user.isAdmin) return;

  const content = (ctx.match as string | undefined)?.trim();
  if (!content) {
    await ctx.reply('Пустое сообщение.');
    return;
  }
  if (!ctx.env.VIP_CHAT_ID) {
    await ctx.reply('Нет ID чата.');
    return;
  }

  await ctx.api.sendMessage(ctx.env.VIP_CHAT_ID, content, { parse_mode: 'HTML' });
  await ctx.reply('✅ Отправлено.');
}
