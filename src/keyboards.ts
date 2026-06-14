import { InlineKeyboard } from 'grammy';

/** Main action menu shown after onboarding. */
export const mainMenu = new InlineKeyboard()
  .text('🍿 В кино', 'act:cinema')
  .text('🏠 Новинки дома', 'act:releases')
  .row()
  .text('🔮 Скоро', 'act:soon')
  .text('👤 Профиль', 'act:profile');
