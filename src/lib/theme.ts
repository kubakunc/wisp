/**
 * Format a 0–1 volume/ratio as a whole-percent string.
 * Clamps out-of-range values; rounds to nearest integer percent.
 * Example: formatPercent(0.8) → "80%"
 */
export function formatPercent(v: number): string {
  const clamped = Math.max(0, Math.min(1, v));
  return `${Math.round(clamped * 100)}%`;
}

/** Alias for use in component templates. */
export const pct = formatPercent;
