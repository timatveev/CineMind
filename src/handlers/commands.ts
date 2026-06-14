import type { MyContext } from '../context.js';
import { mainMenu } from '../keyboards.js';
import { deleteUser, setDigest } from '../db/repository.js';
import { isVip } from '../lib/vip.js';
import { sendLimitMessage } from './recommend.js';

export async function handleProfile(ctx: MyContext): Promise<void> {
  const user = ctx.appUser;
  if (!user || !user.profile) {
    await ctx.reply('Нажми /start');
    return;
  }
  await ctx.reply(`👤 <b>Профиль:</b>\n${user.profile}\n📍 <b>Город:</b> ${user.location ?? '—'}`, {
    parse_mode: 'HTML',
    reply_markup: mainMenu,
  });
}

export async function handleSubscribe(ctx: MyContext): Promise<void> {
  if (!ctx.appUser) {
    await ctx.reply('Нажми /start');
    return;
  }
  await setDigest(ctx.db, ctx.from!.id, true);
  await ctx.reply('✅ Подписка на дайджест оформлена.');
}

export async function handleUnsubscribe(ctx: MyContext): Promise<void> {
  if (!ctx.appUser) {
    await ctx.reply('Нажми /start');
    return;
  }
  await setDigest(ctx.db, ctx.from!.id, false);
  await ctx.reply('🔕 Подписка отменена.');
}

export async function handleDonate(ctx: MyContext): Promise<void> {
  if (!ctx.appUser) {
    await ctx.reply('Нажми /start');
    return;
  }
  if (await isVip(ctx)) {
    await ctx.reply('💎 Ты — VIP. Спасибо за поддержку!');
  } else {
    await sendLimitMessage(ctx);
  }
}

export async function handleDeleteMe(ctx: MyContext): Promise<void> {
  const userId = ctx.from!.id;
  await deleteUser(ctx.db, userId);
  await ctx.env.CACHE.delete(`vip_${userId}`);
  await ctx.reply('🗑 Данные удалены.');
}

export async function handlePrivacy(ctx: MyContext): Promise<void> {
  await ctx.reply(
    '🔒 <b>Приватность</b>\n\n' +
      'Я храню только твой профиль вкусов, город и историю запросов — ' +
      'чтобы давать персональные рекомендации.\n' +
      'Команда /delete_me удаляет все твои данные безвозвратно.',
    { parse_mode: 'HTML' },
  );
}
