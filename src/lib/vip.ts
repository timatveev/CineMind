import { LIMITS } from '../config.js';
import type { MyContext } from '../context.js';

const MEMBER_STATUSES = ['creator', 'administrator', 'member', 'restricted'];

/**
 * Whether the current user has unlimited access:
 * admin, manually granted, or a member of the VIP channel.
 * VIP-channel membership is cached in KV to avoid hammering getChatMember.
 */
export async function isVip(ctx: MyContext): Promise<boolean> {
  const user = ctx.appUser;
  if (!user) return false;
  if (user.isAdmin || user.isSubManual) return true;

  const vipChat = ctx.env.VIP_CHAT_ID;
  if (!vipChat) return false;

  const key = `vip_${user.id}`;
  const cached = await ctx.env.CACHE.get(key);
  if (cached !== null) return cached === '1';

  let member = false;
  try {
    const m = await ctx.api.getChatMember(vipChat, user.id);
    member = MEMBER_STATUSES.includes(m.status);
  } catch {
    member = false;
  }

  await ctx.env.CACHE.put(key, member ? '1' : '0', { expirationTtl: LIMITS.VIP_CACHE_TTL });
  return member;
}

export function dailyLimit(ctx: MyContext): number {
  const n = parseInt(ctx.env.DAILY_LIMIT, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}
