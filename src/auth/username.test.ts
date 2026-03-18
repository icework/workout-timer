import { describe, expect, it } from 'vitest';
import { normalizeUsername } from './username';

describe('normalizeUsername', () => {
  it('normalizes usernames by trimming and lowercasing', () => {
    expect(normalizeUsername(' Alice ')).toBe('alice');
  });

  it('rejects empty usernames', () => {
    expect(() => normalizeUsername('   ')).toThrow('Username is required');
  });
});
