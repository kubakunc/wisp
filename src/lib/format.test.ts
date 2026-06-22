import { describe, it, expect } from 'vitest';
import { formatBytes } from './format';
describe('formatBytes', () => {
  it('formats 0 / KB / MB', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(1_500_000)).toBe('1.5 MB');
    expect(formatBytes(18_000_000)).toBe('18 MB');
  });
});
