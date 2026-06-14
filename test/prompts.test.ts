import { describe, expect, it } from 'vitest';
import { buildCommandPrompt } from '../src/prompts.js';

describe('buildCommandPrompt', () => {
  it('injects location into the cinema prompt', () => {
    expect(buildCommandPrompt('cinema', 'Санкт-Петербург')).toContain('Санкт-Петербург');
  });

  it('passes free text through unchanged', () => {
    const text = 'Посоветуй комедию на вечер';
    expect(buildCommandPrompt(text, 'Москва')).toBe(text);
  });

  it('builds a releases prompt', () => {
    expect(buildCommandPrompt('releases', 'Москва')).toMatch(/цифр/i);
  });
});
