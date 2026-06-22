import { describe, it, expect } from 'vitest';
import { isoWeekIndex, featuredPremiumSoundId } from './featured';

const MONDAY = new Date('2026-06-22T10:00:00Z'); // a Monday
const SAME_WEEK_SUN = new Date('2026-06-28T23:00:00Z'); // Sunday of same ISO week
const NEXT_WEEK = new Date('2026-06-29T01:00:00Z'); // following Monday

describe('isoWeekIndex', () => {
  it('is stable within a Monday→Sunday week and increments the next week', () => {
    expect(isoWeekIndex(SAME_WEEK_SUN)).toBe(isoWeekIndex(MONDAY));
    expect(isoWeekIndex(NEXT_WEEK)).toBe(isoWeekIndex(MONDAY) + 1);
  });
});

describe('featuredPremiumSoundId', () => {
  const ids = ['a', 'b', 'c'];
  it('returns null for an empty catalogue', () => {
    expect(featuredPremiumSoundId(MONDAY, [])).toBeNull();
  });
  it('is stable within a week', () => {
    expect(featuredPremiumSoundId(SAME_WEEK_SUN, ids)).toBe(featuredPremiumSoundId(MONDAY, ids));
  });
  it('advances by one catalogue slot the next week (modulo length)', () => {
    const i = isoWeekIndex(MONDAY);
    expect(featuredPremiumSoundId(MONDAY, ids)).toBe(ids[i % 3]);
    expect(featuredPremiumSoundId(NEXT_WEEK, ids)).toBe(ids[(i + 1) % 3]);
  });
});
