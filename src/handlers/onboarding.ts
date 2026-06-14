import type { MyContext } from '../context.js';
import { mainMenu } from '../keyboards.js';
import { setLocation, setProfile, startUser } from '../db/repository.js';
import { analyzeProfile } from '../services/gemini.js';
import { geocodeCity } from '../services/geocoding.js';

const WELCOME =
  '👋 <b>Привет! Я — CineMind AI.</b>\n\n' +
  'Я помогу найти идеальное кино. Для начала мне нужно узнать твои вкусы.\n\n' +
  '👇 <b>Напиши мне одним сообщением:</b>\n' +
  '1. Любимые жанры и 3 конкретных фильма.\n' +
  '2. С кем обычно смотришь кино?\n' +
  '3. Что точно НЕ предлагать?';

export async function handleStart(ctx: MyContext): Promise<void> {
  await startUser(ctx.db, ctx.from!.id);
  await ctx.reply(WELCOME, { parse_mode: 'HTML' });
}

export async function handleProfileInput(ctx: MyContext, text: string): Promise<void> {
  const userId = ctx.from!.id;
  const chatId = ctx.chat!.id;
  const loadMsg = await ctx.reply('🧠 <b>Анализирую профиль...</b>', { parse_mode: 'HTML' });

  try {
    const structured = await analyzeProfile(ctx.env, text);
    await setProfile(ctx.db, userId, structured);
    await ctx.api.deleteMessage(chatId, loadMsg.message_id).catch(() => {});
    await ctx.reply(`✅ <b>Записал!</b>\n\n${structured}\n\n🌍 <b>Теперь напиши свой Город:</b>`, {
      parse_mode: 'HTML',
    });
  } catch (e) {
    ctx.log.error('Onboarding', userId, 'Profile analysis failed', String(e));
    await ctx.reply('Ошибка анализа. Попробуй короче.');
  }
}

export async function handleLocationInput(ctx: MyContext, text: string): Promise<void> {
  const userId = ctx.from!.id;
  const result = await geocodeCity(text);

  if (!result) {
    await ctx.reply('🤷‍♂️ Не нашёл такой город. Попробуй написать крупный город рядом.');
    return;
  }

  await setLocation(ctx.db, userId, result.formatted);
  await ctx.reply(`✅ Город: <b>${result.formatted}</b>\n🎉 Настройка завершена!`, {
    parse_mode: 'HTML',
    reply_markup: mainMenu,
  });
}
