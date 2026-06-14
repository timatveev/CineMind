import type { Api } from 'grammy';
import { LIMITS } from '../config.js';

/**
 * Convert the Markdown Gemini produces into Telegram-safe HTML.
 * Ported from the legacy TelegramService.formatMessage.
 */
export function formatMessage(text: string): string {
  if (!text) return '';
  let html = text;

  // Strip horizontal rules (---, ***, ___) — Telegram doesn't render them.
  html = html.replace(/^\s*[-*_]{3,}\s*$/gm, '');

  // Markdown headings (#, ##, ###) -> bold.
  html = html.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');

  // Bold (**text**) -> <b>.
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // Italic (*text* / _text_) -> <i>, only on word boundaries.
  html = html.replace(/(^|\s)\*(\S.*?\S)\*(\s|$)/g, '$1<i>$2</i>$3');
  html = html.replace(/(^|\s)_(\S.*?\S)_(\s|$)/g, '$1<i>$2</i>$3');

  // Inline code (`code`) -> <code>.
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // List items (* / -) -> bullets.
  html = html.replace(/^[*-]\s+(.+)$/gm, ' • $1');

  // Collapse 3+ blank lines.
  html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

  return html.trim();
}

/** Split into Telegram-sized chunks without cutting mid-line where possible. */
function chunk(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + '\n' + line).length > size) {
      if (buf) out.push(buf);
      buf = line.length > size ? line.slice(0, size) : line;
    } else {
      buf = buf ? buf + '\n' + line : line;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Send AI text as HTML with two safety nets:
 *  - splits messages longer than the Telegram limit;
 *  - if Telegram rejects the HTML (unclosed tag from the model), retries as plain text.
 * Returns the message_id of the last sent message.
 */
export async function sendFormatted(
  api: Api,
  chatId: number | string,
  text: string,
): Promise<number | undefined> {
  const html = formatMessage(text);
  if (!html) return undefined;

  let lastId: number | undefined;
  for (const part of chunk(html, LIMITS.MAX_MESSAGE_LENGTH)) {
    try {
      const msg = await api.sendMessage(chatId, part, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      lastId = msg.message_id;
    } catch {
      // HTML parse error → strip tags and resend as plain text.
      const plain = part.replace(/<[^>]*>?/gm, '');
      const msg = await api.sendMessage(chatId, plain, {
        link_preview_options: { is_disabled: true },
      });
      lastId = msg.message_id;
    }
  }
  return lastId;
}
