import { SOUNDS } from './registry';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Whole weeks since the epoch with weeks breaking on Monday 00:00 UTC. The
 *  first Monday was 1970-01-05 (epoch + 4 days), so a +3-day shift makes each
 *  Monday land on a week multiple. Monotonic and stable; only its modulo (mapped
 *  onto the premium catalogue) matters. */
export function isoWeekIndex(date: Date): number {
  return Math.floor((date.getTime() + 3 * MS_PER_DAY) / MS_PER_WEEK);
}

/** The premium sound featured for `date`'s week, or null when there are none.
 *  `premiumIds` must be stably ordered. */
export function featuredPremiumSoundId(date: Date, premiumIds: string[]): string | null {
  if (premiumIds.length === 0) return null;
  return premiumIds[isoWeekIndex(date) % premiumIds.length];
}

const PREMIUM_IDS = SOUNDS.filter((s) => s.tier === 'premium').map((s) => s.id);

/** Runtime wrapper: this week's featured premium sound from the live catalogue. */
export function featuredSoundId(now: Date = new Date()): string | null {
  return featuredPremiumSoundId(now, PREMIUM_IDS);
}
