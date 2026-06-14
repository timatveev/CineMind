import { describe, expect, it } from 'vitest';
import { formatMessage } from '../src/services/telegram.js';

describe('formatMessage', () => {
  it('converts **bold** to <b>', () => {
    expect(formatMessage('Смотри **Дюна (2021)**')).toBe('Смотри <b>Дюна (2021)</b>');
  });

  it('converts markdown headings to bold', () => {
    expect(formatMessage('## Рекомендации')).toBe('<b>Рекомендации</b>');
  });

  it('turns list items into bullets', () => {
    expect(formatMessage('- Интерстеллар\n- Начало')).toBe('• Интерстеллар\n • Начало');
  });

  it('strips horizontal rules', () => {
    expect(formatMessage('Текст\n---\nЕщё')).toBe('Текст\n\nЕщё');
  });

  it('converts inline code', () => {
    expect(formatMessage('Жанр: `sci-fi`')).toBe('Жанр: <code>sci-fi</code>');
  });

  it('returns empty string for empty input', () => {
    expect(formatMessage('')).toBe('');
  });
});
