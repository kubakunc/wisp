import { describe, it, expect } from 'vitest';
import { formatPercent } from './theme';

describe('formatPercent', () => {
  it('formats 0..1 as whole-percent strings', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.8)).toBe('80%');
    expect(formatPercent(1)).toBe('100%');
  });
  it('rounds to nearest percent', () => {
    expect(formatPercent(0.555)).toBe('56%');
  });
  it('clamps out-of-range input', () => {
    expect(formatPercent(-1)).toBe('0%');
    expect(formatPercent(2)).toBe('100%');
  });
});
