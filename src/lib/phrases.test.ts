import { describe, it, expect } from 'vitest';
import { BEDTIME_PHRASES, phraseForDate } from './phrases';

describe('bedtime phrases', () => {
  it('provides 50 phrases', () => {
    expect(BEDTIME_PHRASES.length).toBe(50);
  });

  it('all phrases are short and non-empty', () => {
    for (const p of BEDTIME_PHRASES) {
      expect(p.trim().length).toBeGreaterThan(0);
      expect(p.length).toBeLessThanOrEqual(24);
    }
  });

  it('is stable for the same calendar day', () => {
    const morning = new Date('2026-06-22T06:00:00Z');
    const night = new Date('2026-06-22T23:30:00Z');
    expect(phraseForDate(morning)).toBe(phraseForDate(night));
  });

  it('changes from one day to the next', () => {
    const d1 = new Date('2026-06-22T12:00:00Z');
    const d2 = new Date('2026-06-23T12:00:00Z');
    expect(phraseForDate(d1)).not.toBe(phraseForDate(d2));
  });

  it('always returns a phrase from the list', () => {
    for (let i = 0; i < 120; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000);
      expect(BEDTIME_PHRASES).toContain(phraseForDate(d));
    }
  });
});
