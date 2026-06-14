/** Static, non-secret configuration and constants. */

export const COMMANDS = {
  START: 'start',
  RELEASES: 'releases',
  CINEMA: 'cinema',
  SOON: 'soon',
  POST: 'post',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PROFILE: 'profile',
  DONATE: 'donate',
  PRIVACY: 'privacy',
  DELETE_ME: 'delete_me',
} as const;

/** Public command list registered via setMyCommands. */
export const PUBLIC_COMMANDS = [
  { command: COMMANDS.START, description: '🚀 Запуск и настройка профиля' },
  { command: COMMANDS.RELEASES, description: '🏠 Новинки дома (цифра)' },
  { command: COMMANDS.CINEMA, description: '🍿 Что идёт в кино рядом' },
  { command: COMMANDS.SOON, description: '🔮 Скоро в прокате' },
  { command: COMMANDS.PROFILE, description: '👤 Мой профиль вкусов' },
  { command: COMMANDS.SUBSCRIBE, description: '🔔 Подписка на дайджест' },
  { command: COMMANDS.UNSUBSCRIBE, description: '🔕 Отписаться от дайджеста' },
  { command: COMMANDS.DONATE, description: '💎 Поддержать проект / VIP' },
  { command: COMMANDS.DELETE_ME, description: '🗑 Удалить мои данные' },
];

export const LIMITS = {
  /** How many recent history turns (user+model messages) to feed back to Gemini. */
  HISTORY_TURNS: 10,
  /** Telegram hard cap is 4096; leave headroom. */
  MAX_MESSAGE_LENGTH: 4000,
  /** KV TTL for dedup keys (seconds). */
  DEDUP_TTL: 300,
  /** KV TTL for cached VIP status (seconds). */
  VIP_CACHE_TTL: 3600,
} as const;

export const USER_STATE = {
  WAITING_PROFILE: 'WAITING_PROFILE',
  WAITING_LOCATION: 'WAITING_LOCATION',
  READY: 'READY',
} as const;

export type UserState = (typeof USER_STATE)[keyof typeof USER_STATE];
