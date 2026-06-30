/** Parse the numeric amount out of a localized price string such as
 *  "$34.99", "34,99 €", or "£6.99". Returns null when no number is present.
 *  (Handles a comma decimal separator; thousands separators are not expected
 *  on subscription prices.) */
export function parsePriceNumber(priceString: string): number | null {
  const match = priceString.match(/[\d.,]+/);
  if (!match) return null;
  const n = parseFloat(match[0].replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Percentage saved by buying the annual plan instead of paying the monthly
 *  plan for twelve months. Both strings must be in the same currency (they
 *  always are for a given user). Returns a rounded positive integer, or null
 *  when it can't be computed or the annual plan isn't actually cheaper. */
export function annualSavingsPercent(monthlyPrice: string, annualPrice: string): number | null {
  const m = parsePriceNumber(monthlyPrice);
  const a = parsePriceNumber(annualPrice);
  if (m === null || a === null || m <= 0) return null;
  const pct = Math.round((1 - a / (m * 12)) * 100);
  return pct > 0 ? pct : null;
}
